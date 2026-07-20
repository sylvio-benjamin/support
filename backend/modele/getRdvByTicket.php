<?php
header('Content-Type: application/json');
require '../config/cors.php';
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

require_once '../connexionBDD.php';

$idTicket = isset($_GET['idTicket']) ? intval($_GET['idTicket']) : 0;
if (!$idTicket) {
    echo json_encode(['success' => false, 'error' => 'idTicket manquant']);
    exit;
}

try {
    $stmt = $bdd->prepare("SELECT * FROM Calendrier WHERE idTicket = :idTicket ORDER BY date DESC, heure DESC LIMIT 1");
    $stmt->execute(['idTicket' => $idTicket]);
    $rdv = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($rdv) {
        echo json_encode(['success' => true, 'rdv' => $rdv]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Aucun RDV trouvé pour ce ticket.']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur BDD.']);
} 
