# Projet Support - Système de Ticketing

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- npm
- MySQL
- Certificats SSL configurés

### Installation

1. **Cloner le projet**
```bash
git clone [url-du-repo]
cd support
```

2. **Créer le fichier .env**
```bash
cp .env.example .env
# Éditer le fichier .env avec vos valeurs
```

3. **Démarrer tous les services**
```bash
./start.sh
```

## 📋 Gestion des Services

### Scripts Disponibles

- **`./start.sh`** - Démarre tous les services (frontend + backend)
- **`./stop.sh`** - Arrête tous les services
- **`./status.sh`** - Affiche le statut des services

### Commandes Utiles

```bash
# Voir les logs en temps réel
tail -f logs/frontend.log
tail -f logs/backend.log

# Redémarrer un service spécifique
./stop.sh && ./start.sh

# Vérifier les ports utilisés
lsof -i:3000  # Frontend
lsof -i:3001  # Backend WebSocket
```

## 🔧 Configuration

### Variables d'Environnement

Le projet utilise un fichier `.env` pour centraliser toute la configuration :

```bash
# Configuration générale
NODE_ENV=production
APP_URL=https://support.lyovatech.com
FRONTEND_PORT=3000
BACKEND_PORT=3001

# Base de données
DB_HOST=127.0.0.1
DB_USER=pma4support
DB_PASSWORD=your_password_here
DB_NAME=Support
DB_CHARSET=utf8

# SSL
SSL_CERT_PATH=/path/to/fullchain.pem
SSL_KEY_PATH=/path/to/privkey.pem

# APIs
NEXT_PUBLIC_API_BASE_URL=https://support.lyovatech.com/backend
NEXT_PUBLIC_WEBSOCKET_URL=https://support.lyovatech.com:3001
```

### Structure du Projet

```
support/
├── frontend/          # Application Next.js
├── backend/           # Serveur Node.js + WebSocket + API PHP
├── logs/              # Logs des services
├── .env.example       # Template de configuration
├── start.sh           # Script de démarrage
├── stop.sh            # Script d'arrêt
├── status.sh          # Script de statut
└── README.md          # Cette documentation
```

## 🏗️ Architecture

### Frontend (Next.js)
- Port : 3000
- Framework : Next.js 14.2.30
- WebSocket client pour temps réel

### Backend (Node.js)
- Port : 3001
- WebSocket server avec Socket.IO
- API PHP pour les données

### Base de Données
- MySQL
- Connexion centralisée via PHP

## 🔐 Sécurité

### Changements Importants

1. **Mots de passe sécurisés** - Plus de mots de passe hardcodés
2. **Variables d'environnement** - Configuration centralisée
3. **CORS configuré** - Sécurité des requêtes cross-origin

### Recommandations

- Utilisez des mots de passe forts
- Limitez les CORS aux domaines nécessaires
- Surveillez les logs régulièrement

## 🐛 Dépannage

### Problèmes Courants

1. **Port déjà utilisé**
```bash
./stop.sh  # Arrêter tous les services
lsof -i:3000  # Vérifier le port
```

2. **Erreur de connexion base de données**
```bash
# Vérifier les variables d'environnement
cat .env | grep DB_
```

3. **Services qui ne démarrent pas**
```bash
# Vérifier les logs
tail -f logs/frontend.log
tail -f logs/backend.log
```

### Logs

Les logs sont stockés dans le répertoire `logs/` :
- `frontend.log` - Logs du frontend Next.js
- `backend.log` - Logs du backend Node.js

## 📊 Monitoring

### Vérification de l'État

```bash
# Statut complet
./status.sh

# Ports utilisés
ss -tlnp | grep -E ':300[01]'

# Processus actifs
ps aux | grep -E "(node|npm)" | grep -v grep
```

## 🔄 Déploiement

### Environnement de Production

1. Copier les fichiers sur le serveur
2. Configurer le fichier `.env`
3. Exécuter `./start.sh`

### Mise à Jour

```bash
# Arrêter les services
./stop.sh

# Mettre à jour le code
git pull

# Redémarrer
./start.sh
```

## 💡 Bonnes Pratiques

- Testez toujours en environnement de développement
- Sauvegardez la base de données avant les mises à jour
- Surveillez les logs après déploiement
- Utilisez `./status.sh` pour vérifier l'état des services

## 🆘 Support

En cas de problème :
1. Vérifiez les logs : `tail -f logs/*.log`
2. Vérifiez le statut : `./status.sh`
3. Redémarrez les services : `./stop.sh && ./start.sh` 