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
// Vérification de session plus flexible pour les admins
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

// Vérifier que l'utilisateur a un rôle valide
if (!isset($_SESSION['user']['role'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Rôle utilisateur manquant']);
    exit;
}

// Autoriser les rôles admin, directeur, technicien, referent
$rolesAutorises = ['admin', 'directeur', 'technicien', 'referent'];
if (!in_array($_SESSION['user']['role'], $rolesAutorises)) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès non autorisé']);
    exit;
}

require_once '../connexionBDD.php';

try {
    $stmt = $bdd->query("SELECT idEntreprise, nomEntreprise FROM entreprise ORDER BY nomEntreprise ASC");
    $entreprises = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'entreprises' => $entreprises]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
?> 