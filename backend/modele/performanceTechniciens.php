<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();

// Statistiques de performance du personnel INTERNE : réservé au directeur
// interne, pas à un directeur "client" qui n'a rien à voir avec le personnel
// LyovaTech.
if (!estDirecteurPlateforme()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé - Directeur requis']);
    exit;
}

require_once '../connexionBDD.php';

try {
    $stmt = $bdd->query("
        SELECT
            t.idTechnicien,
            t.nomTechnicien,
            t.prenomTechnicien,
            COUNT(a.idTicketArchive) AS ticketsTraites,
            SUM(CASE WHEN a.statut = 'resolu' THEN 1 ELSE 0 END) AS ticketsResolus,
            SUM(CASE WHEN a.statut = 'ferme' THEN 1 ELSE 0 END) AS ticketsFermes,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, a.dateCreation, a.dateTicketCloture)), 1) AS tempsMoyenHeures,
            (SELECT COUNT(*) FROM ticket tk WHERE tk.idTechnicien = t.idTechnicien AND tk.statut IN ('en_attente', 'en_cours')) AS ticketsEnCours
        FROM techniciens t
        LEFT JOIN archiveTicket a ON a.idTechnicien = t.idTechnicien
        WHERE t.role = 'technicien'
        GROUP BY t.idTechnicien, t.nomTechnicien, t.prenomTechnicien
        ORDER BY ticketsResolus DESC, ticketsTraites DESC
    ");

    $techniciens = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'techniciens' => $techniciens]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
