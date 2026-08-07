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

// Réglages GLOBAUX de toute la plateforme : réservé au directeur INTERNE (voir
// estDirecteurPlateforme() dans config/session.php).
if (!estDirecteurPlateforme()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé - Directeur requis']);
    exit;
}

require_once '../connexionBDD.php';

try {
    $stmt = $bdd->query("SELECT notifEmail, notifTicketNouveau, notifTicketUrgent, notifResolution, autoAssign, delaiRelanceHeures FROM parametresPlateforme WHERE id = 1");
    $parametres = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$parametres) {
        // Filet de sécurité : la ligne singleton devrait toujours exister
        $bdd->exec("INSERT IGNORE INTO parametresPlateforme (id) VALUES (1)");
        $stmt = $bdd->query("SELECT notifEmail, notifTicketNouveau, notifTicketUrgent, notifResolution, autoAssign, delaiRelanceHeures FROM parametresPlateforme WHERE id = 1");
        $parametres = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    echo json_encode(['success' => true, 'parametres' => $parametres]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
