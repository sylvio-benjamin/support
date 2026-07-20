<?php
function sendJsonResponse($data, $httpCode = 200) {
    while (ob_get_level()) { ob_end_clean(); }
    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$idCalendrier = $data['idCalendrier'] ?? null;
$reponse = $data['reponse'] ?? null;
$idUtilisateur = $data['idUtilisateur'] ?? null;
$idTicket = $data['idTicket'] ?? null;

if (!empty($idCalendrier) && is_numeric($idCalendrier) && !empty($reponse) && ($reponse === 'accepte' || $reponse === 'refuse')) {
    require '../connexionBDD.php';
    require 'Calendrier.php';

    try {
        if ($reponse === 'accepte') {
            $stmt2 = $bdd->prepare("UPDATE Calendrier SET Acceptation = 'Accepté', status = 'Présent' WHERE idCalendrier = :id");
            $stmt2->execute(['id' => $idCalendrier]);
        } else if ($reponse === 'refuse') {
            $stmt2 = $bdd->prepare("UPDATE Calendrier SET Acceptation = 'Refusé', status = 'Fermé' WHERE idCalendrier = :id");
            $stmt2->execute(['id' => $idCalendrier]);
        }

        $messageTexte = $reponse === "accepte"
            ? "Le rendez-vous a été accepté par l'utilisateur."
            : "Le rendez-vous a été refusé par l'utilisateur.";
        $stmt = $bdd->prepare("INSERT INTO conversation (idTicket, idExpediteur, message, dateEnvoi) VALUES (:idTicket, :idExpediteur, :message, NOW())");
        $stmt->execute([
            'idTicket' => $idTicket,
            'idExpediteur' => $idUtilisateur ? $idUtilisateur : 0,
            'message' => $messageTexte
        ]);

        sendJsonResponse(['success' => true]);
    } catch (Exception $e) {
        error_log('updateRDV.php: ' . $e->getMessage());
        sendJsonResponse(['success' => false, 'error' => 'Erreur serveur.'], 500);
    }
} else {
    sendJsonResponse(['success' => false, 'error' => 'Paramètres manquants (idCalendrier ou reponse)'], 400);
}
