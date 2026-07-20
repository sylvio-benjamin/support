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

// Récupérer l'id du technicien (via GET ou POST)
$idTechnicien = isset($_GET['idTechnicien']) ? intval($_GET['idTechnicien']) : (isset($_POST['idTechnicien']) ? intval($_POST['idTechnicien']) : 0);
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
