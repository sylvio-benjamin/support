<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

require_once '../connexionBDD.php';

// idTechnicien dérivé de la SESSION, jamais de GET/POST : sinon n'importe quel
// compte authentifié pouvait lire le calendrier (noms clients, téléphones) de
// N'IMPORTE QUEL technicien via une simple requête GET — non protégée par
// SameSite=Lax (qui autorise les GET cross-site). Le frontend n'a jamais
// envoyé que son propre id (voir components/TechnicianCalendar.tsx).
$idTechnicien = (int)($_SESSION['user']['idTechnicien'] ?? 0);
if (!$idTechnicien) {
    echo json_encode(['erreur' => 'idTechnicien manquant']);
    exit;
}

try {
    $requete = $bdd->prepare("SELECT c.idCalendrier, c.idTechnicien, c.idUtilisateur, c.idTicket, c.date, c.heure, c.Titre, c.status, c.priorite, c.Acceptation,
                                    u.nomUtilisateur, u.prenomUtilisateur, u.telephone AS telephoneClient, t.titre AS nomTicket
                              FROM Calendrier c
                              LEFT JOIN utilisateur u ON c.idUtilisateur = u.idUtilisateur
                              LEFT JOIN ticket t ON c.idTicket = t.idTicket
                              WHERE c.status = 'Présent' AND c.idTechnicien = :idTechnicien
                              ORDER BY c.date, c.heure");
    $requete->execute(['idTechnicien' => $idTechnicien]);
    $rdvs = $requete->fetchAll(PDO::FETCH_ASSOC);

    $resultat = [];
    foreach ($rdvs as $rdv) {
        $dateStr = $rdv['date'];
        if (!isset($resultat[$dateStr])) $resultat[$dateStr] = [];
        $nomClient = trim(($rdv['prenomUtilisateur'] ?? '') . ' ' . ($rdv['nomUtilisateur'] ?? ''));
        $nomClient = $nomClient ?: 'Client';
        $nomTicket = $rdv['nomTicket'] ?? '';
        $resultat[$dateStr][] = [
            'id' => $rdv['idCalendrier'],
            'heure' => substr($rdv['heure'], 0, 5),
            'titre' => $rdv['Titre'],
            'client' => $nomClient,
            'telephoneClient' => $rdv['telephoneClient'] ?? '',
            'nomTicket' => $nomTicket,
            'statut' => $rdv['priorite'] === 'urgent' ? 'urgent' : ($rdv['status'] === 'Présent' ? 'normal' : 'termine'),
            'ticket' => '#' . $rdv['idTicket']
        ];
    }

    echo json_encode($resultat);
} catch (Exception $e) {
    echo json_encode(['erreur' => 'Une erreur est survenue.']);
} 
