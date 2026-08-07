<?php
header('Content-Type: application/json');
require '../config/cors.php';
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configuration de la session
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Strict');

require_once __DIR__ . '/../config/session.php';
startSecureSession();
try {
    // Vérifier si l'utilisateur est connecté et est un admin référent
    if (!isset($_SESSION['user']) || !isset($_SESSION['user_type']) || $_SESSION['user_type'] !== 'admin') {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Non autorisé']);
        exit;
    }

    $idEntreprise = $_SESSION['user']['idEntreprise'] ?? null;
    
    if (!$idEntreprise) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID entreprise manquant']);
        exit;
    }

    // Connexion à la base de données
    require_once __DIR__ . '/../connexionBDD.php';

    // Récupérer les informations de l'entreprise
    $stmt = $bdd->prepare("SELECT idEntreprise, nomEntreprise, adresseEntreprise, telephoneEntreprise, emailEntreprise FROM entreprise WHERE idEntreprise = ?");
    $stmt->execute([$idEntreprise]);
    $entreprise = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$entreprise) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Entreprise non trouvée']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'entreprise' => $entreprise
    ]);

} catch (PDOException $e) {
    error_log("Erreur base de données: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données']);
} catch (Exception $e) {
    error_log("Erreur générale: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
?> 