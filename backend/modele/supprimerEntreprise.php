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

// Vérifier que l'utilisateur est un directeur
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['role']) || $_SESSION['user']['role'] !== 'directeur') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé - Directeur requis']);
    exit;
}

require '../connexionBDD.php';

$data = json_decode(file_get_contents('php://input'), true);
$idEntreprise = $data['idEntreprise'] ?? null;

if (empty($idEntreprise)) {
    echo json_encode(['success' => false, 'error' => 'ID entreprise requis.']);
    exit;
}

// Vérifier que l'entreprise existe
$stmt = $bdd->prepare("SELECT idEntreprise FROM entreprise WHERE idEntreprise = :id");
$stmt->bindParam(':id', $idEntreprise);
$stmt->execute();

if ($stmt->rowCount() === 0) {
    echo json_encode(['success' => false, 'error' => 'Entreprise non trouvée.']);
    exit;
}

// Empêcher la suppression si des utilisateurs sont encore rattachés à cette entreprise
$stmt = $bdd->prepare("SELECT COUNT(*) as nb FROM utilisateur WHERE idEntreprise = :id");
$stmt->bindParam(':id', $idEntreprise);
$stmt->execute();
$result = $stmt->fetch(PDO::FETCH_ASSOC);

if ($result['nb'] > 0) {
    echo json_encode(['success' => false, 'error' => 'Impossible de supprimer cette entreprise : des utilisateurs y sont encore rattachés.']);
    exit;
}

try {
    $stmt = $bdd->prepare("DELETE FROM entreprise WHERE idEntreprise = :id");
    $stmt->bindParam(':id', $idEntreprise);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Entreprise supprimée avec succès.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Erreur lors de la suppression.']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la suppression.']);
}
