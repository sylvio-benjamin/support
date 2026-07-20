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
// API publique pour récupérer la liste des services (accessible à tous les utilisateurs connectés)
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

require '../connexionBDD.php';

try {
    // Récupérer seulement les services ouverts ou avec des horaires
    $stmt = $bdd->query("
        SELECT idService, nomService, heureDebut, heureFin, jourDebut, jourFin 
        FROM services 
        WHERE nomService IS NOT NULL AND nomService != ''
        ORDER BY nomService ASC
    ");
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'services' => $services]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
?>