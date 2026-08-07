<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();

// Réglages GLOBAUX de toute la plateforme (singleton WHERE id=1) : réservé au
// directeur INTERNE. role==='directeur' seul inclut aussi les directeurs
// "client" (une entreprise), qui ne doivent jamais changer une config qui
// affecte TOUTES les entreprises (confirmé exploitable pour
// desactiverEntreprise.php/modifierUtilisateur.php — même pattern ici).
if (!estDirecteurPlateforme()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé - Directeur requis']);
    exit;
}

require_once '../connexionBDD.php';

$data = json_decode(file_get_contents('php://input'), true);

$delaiRelanceHeures = intval($data['delaiRelanceHeures'] ?? 48);
if ($delaiRelanceHeures < 1) {
    $delaiRelanceHeures = 48;
}

try {
    $stmt = $bdd->prepare("
        UPDATE parametresPlateforme SET
            notifEmail = :notifEmail,
            notifTicketNouveau = :notifTicketNouveau,
            notifTicketUrgent = :notifTicketUrgent,
            notifResolution = :notifResolution,
            autoAssign = :autoAssign,
            delaiRelanceHeures = :delaiRelanceHeures
        WHERE id = 1
    ");
    $stmt->execute([
        ':notifEmail' => !empty($data['notifEmail']) ? 1 : 0,
        ':notifTicketNouveau' => !empty($data['notifTicketNouveau']) ? 1 : 0,
        ':notifTicketUrgent' => !empty($data['notifTicketUrgent']) ? 1 : 0,
        ':notifResolution' => !empty($data['notifResolution']) ? 1 : 0,
        ':autoAssign' => !empty($data['autoAssign']) ? 1 : 0,
        ':delaiRelanceHeures' => $delaiRelanceHeures,
    ]);

    echo json_encode(['success' => true, 'message' => 'Paramètres enregistrés.']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'enregistrement.']);
}
