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

// idUtilisateur dérivé de la SESSION, jamais de GET/POST : sinon n'importe
// quel compte authentifié pouvait lire le calendrier (téléphone du
// technicien inclus) de N'IMPORTE QUEL employé via une simple requête GET —
// non protégée par SameSite=Lax (qui autorise les GET cross-site). Le
// frontend n'a jamais envoyé que son propre id (voir components/EmployeeCalendar.tsx).
$idUtilisateur = (int)($_SESSION['user']['idUtilisateur'] ?? 0);
if (!$idUtilisateur) {
    echo json_encode(['erreur' => 'idUtilisateur manquant']);
    exit;
}

try {
    $requete = $bdd->prepare("SELECT c.idCalendrier, c.idTechnicien, c.idUtilisateur, c.idTicket, c.date, c.heure, c.Titre, c.status, c.priorite, c.Acceptation,
    u.nomUtilisateur, u.prenomUtilisateur, t.titre AS nomTicket,
    tech.nomTechnicien AS nomTechnicien, tech.prenomTechnicien AS prenomTechnicien, tech.telephone AS telephoneTechnicien
FROM Calendrier c
LEFT JOIN utilisateur u ON c.idUtilisateur = u.idUtilisateur
LEFT JOIN ticket t ON c.idTicket = t.idTicket
LEFT JOIN techniciens tech ON c.idTechnicien = tech.idTechnicien
WHERE c.status = 'Présent' AND c.idUtilisateur = :idUtilisateur
ORDER BY c.date, c.heure");
    $requete->execute(['idUtilisateur' => $idUtilisateur]);
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
            'nomTicket' => $nomTicket,
            'statut' => $rdv['priorite'] === 'urgent' ? 'urgent' : ($rdv['status'] === 'Présent' ? 'normal' : 'termine'),
            'ticket' => '#' . $rdv['idTicket'],
            'nomTechnicien' => trim(($rdv['prenomTechnicien'] ?? '') . ' ' . ($rdv['nomTechnicien'] ?? '')),
            'telephoneTechnicien' => $rdv['telephoneTechnicien'] ?? ''
        ];
    }

    echo json_encode($resultat);
} catch (Exception $e) {
    echo json_encode(['erreur' => 'Une erreur est survenue.']);
} 
