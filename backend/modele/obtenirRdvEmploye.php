<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

header('Content-Type: application/json');
require_once '../connexionBDD.php';

// Récupérer l'id de l'employé (via GET ou POST)
$idUtilisateur = isset($_GET['idUtilisateur']) ? intval($_GET['idUtilisateur']) : (isset($_POST['idUtilisateur']) ? intval($_POST['idUtilisateur']) : 0);
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
