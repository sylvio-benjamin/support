require('dotenv').config({ path: require('path').join(__dirname, '../support-it/.env') });

if (!process.env.DB_PASSWORD) {
  console.error('Variable d\'environnement requise manquante : DB_PASSWORD. Arrêt du serveur.');
  process.exit(1);
}

const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Configuration CORS centralisée
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost', 'http://localhost:3000'],
  credentials: true,
  methods: ["GET", "POST"]
};

app.use(cors(corsOptions));

// Configuration HTTPS (avec repli en HTTP si les certificats SSL sont absents, ex: en local)
const sslKeyPath = process.env.SSL_KEY_PATH || '/etc/letsencrypt/live/support.lyovatech.com/privkey.pem';
const sslCertPath = process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/support.lyovatech.com/fullchain.pem';
const sslAvailable = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

const server = sslAvailable
  ? https.createServer({ key: fs.readFileSync(sslKeyPath), cert: fs.readFileSync(sslCertPath) }, app)
  : http.createServer(app);

// Configuration Socket.IO
const io = new Server(server, {
  cors: corsOptions
});

// Connexion base de données
// Si DB_SOCKET est défini (ex: MAMP avec skip-networking), on se connecte via socket Unix
// plutôt que host:port, car MySQL peut ne pas écouter en TCP.
const dbConfig = process.env.DB_SOCKET
  ? {
      socketPath: process.env.DB_SOCKET,
      user: process.env.DB_USER || 'pma4support',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'Support'
    }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'pma4support',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'Support'
    };

// MySQL ferme les connexions inactives après `wait_timeout` : sans handler
// d'erreur, cet évènement n'est jamais catché et fait planter tout le
// process Node (donc le serveur WebSocket entier). On reconnecte au lieu de
// laisser crasher.
let db;
function connecterBDD() {
  db = mysql.createConnection(dbConfig);
  db.on('error', (err) => {
    console.error('Erreur de connexion MySQL (WebSocket) :', err.code || err.message);
    if (err.fatal || err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('Reconnexion à MySQL dans 1s...');
      setTimeout(connecterBDD, 1000);
    }
  });
}
connecterBDD();

// Ajout d'un handler pour recevoir l'id du technicien et l'id du ticket courant
io.on('connection', (socket) => {
  socket.on('subscribeTickets', async ({ idTechnicien, idTicket }) => {
    // Requête pour les tickets du technicien
    let sql = `
      SELECT t.*, u.nomUtilisateur, u.prenomUtilisateur, tech.nomTechnicien, tech.prenomTechnicien
      FROM ticket t
      LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
      LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien
      WHERE t.idTechnicien = ?
    `;
    let params = [idTechnicien];
    // Si un idTicket courant est précisé, on l'ajoute même s'il n'est pas assigné au technicien
    if (idTicket) {
      sql += ' OR t.idTicket = ?';
      params.push(idTicket);
    }
    db.query(sql, params, async (err, results) => {
    if (!err) {
        // Pour chaque ticket, ajouter les pièces jointes
        const ticketsWithFiles = await Promise.all(results.map(async (ticket) => {
          return new Promise((resolve) => {
            db.query('SELECT cheminFichier FROM fichier WHERE idTicket = ?', [ticket.idTicket], (err2, files) => {
              ticket.pieceJointe = files ? files.map(f => f.cheminFichier) : [];
              resolve(ticket);
            });
          });
        }));
        // Log des ids envoyés
        console.log('[WS] Envoi tickets:', ticketsWithFiles.map(t=>t.idTicket));
        socket.emit('tickets_mis_a_jour', ticketsWithFiles);
    }
    });
  });

  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('message', (data) => {
    const room = data.idTicket ? `ticket-${data.idTicket}` : data.room;
    console.log('Message reçu sur le serveur pour room:', room, data);
    io.to(room).emit('message', data);
  });

  socket.on('messageModifie', (data) => {
    const room = data.idTicket ? `ticket-${data.idTicket}` : data.room;
    io.to(room).emit('messageModifie', data);
  });

  socket.on('messageSupprime', (data) => {
    const room = data.idTicket ? `ticket-${data.idTicket}` : data.room;
    io.to(room).emit('messageSupprime', data);
  });
});

app.post('/notify', express.json(), (req, res) => {
  db.query(`
    SELECT t.*, u.nomUtilisateur, u.prenomUtilisateur, tech.nomTechnicien, tech.prenomTechnicien
    FROM ticket t
    LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur
    LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien
  `, (err, results) => {
    if (!err) {
      io.emit('tickets_mis_a_jour', results);
      if (results && results.length > 0) {
        const nouveauTicket = results.reduce((max, t) => t.idTicket > max.idTicket ? t : max, results[0]);
        console.log('--- DEBUG NOUVEAU_TICKET ---');
        console.log('Tickets récupérés:', results.length);
        console.log('Ticket envoyé:', nouveauTicket);
        io.emit('nouveau_ticket', nouveauTicket);
      } else {
        console.log('Aucun ticket trouvé pour la notif.');
      }
      res.sendStatus(200);
    } else {
      console.error('Erreur SQL /notify :', err);
      res.sendStatus(500);
    }
  });
});

const PORT = process.env.BACKEND_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const APP_URL = process.env.APP_URL || 'http://localhost';

server.listen(PORT, HOST, () => {
  console.log(`Serveur WebSocket sur ${APP_URL}:${PORT} (${sslAvailable ? 'https' : 'http'})`);
});
