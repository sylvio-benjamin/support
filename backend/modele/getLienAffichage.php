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

// Le lien public de l'écran d'affichage est un réglage GLOBAL de toute la
// plateforme : réservé au directeur INTERNE (voir estDirecteurPlateforme()).
if (!estDirecteurPlateforme()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé - Directeur requis']);
    exit;
}

require_once '../connexionBDD.php';

try {
    $stmt = $bdd->query("SELECT tokenAffichage FROM parametresPlateforme WHERE id = 1");
    $token = $stmt->fetchColumn();

    // Filet de sécurité : aucun lien n'a encore été généré (première
    // utilisation de la fonctionnalité).
    if (!$token) {
        $token = bin2hex(random_bytes(32));
        $maj = $bdd->prepare("UPDATE parametresPlateforme SET tokenAffichage = :token WHERE id = 1");
        $maj->execute([':token' => $token]);
    }

    echo json_encode(['success' => true, 'token' => $token]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
