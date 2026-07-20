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

require '../connexionBDD.php';

$data = json_decode(file_get_contents("php://input"), true);

$idUtilisateur = $data['idUtilisateur'] ?? 0;
$estDirecteur = ($_SESSION['user']['role'] === 'directeur');
$idEntreprise = $_SESSION['user']['idEntreprise'] ?? null;

if (empty($idUtilisateur)) {
    echo json_encode(['success' => false, 'error' => 'ID utilisateur requis.']);
    exit;
}

// Vérifier que l'admin référent a une entreprise (le directeur gère toutes les entreprises)
if (!$estDirecteur && !$idEntreprise) {
    echo json_encode(['success' => false, 'error' => 'ID entreprise manquant pour l\'admin référent']);
    exit;
}

// Vérifier si l'utilisateur existe (scope entreprise pour l'admin référent uniquement)
if ($estDirecteur) {
    $stmt = $bdd->prepare("SELECT idUtilisateur, loginUtilisateur FROM utilisateur WHERE idUtilisateur = :id");
    $stmt->bindParam(':id', $idUtilisateur);
} else {
    $stmt = $bdd->prepare("SELECT idUtilisateur, loginUtilisateur FROM utilisateur WHERE idUtilisateur = :id AND idEntreprise = :idEntreprise");
    $stmt->bindParam(':id', $idUtilisateur);
    $stmt->bindParam(':idEntreprise', $idEntreprise);
}
$stmt->execute();

if ($stmt->rowCount() === 0) {
    echo json_encode(['success' => false, 'error' => 'Utilisateur non trouvé ou n\'appartient pas à votre entreprise.']);
    exit;
}

// Vérifier si l'utilisateur a des tickets associés
$stmt = $bdd->prepare("SELECT COUNT(*) as nb_tickets FROM ticket WHERE idUtilisateur = :id");
$stmt->bindParam(':id', $idUtilisateur);
$stmt->execute();
$result = $stmt->fetch(PDO::FETCH_ASSOC);

if ($result['nb_tickets'] > 0) {
    echo json_encode(['success' => false, 'error' => 'Impossible de supprimer cet utilisateur car il a des tickets associés.']);
    exit;
}

try {
    // Supprimer l'utilisateur
    $stmt = $bdd->prepare("DELETE FROM utilisateur WHERE idUtilisateur = :id");
    $stmt->bindParam(':id', $idUtilisateur);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Utilisateur supprimé avec succès.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Erreur lors de la suppression.']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la suppression.']);
}
?> 