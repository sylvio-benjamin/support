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

require_once '../connexionBDD.php';

$data = json_decode(file_get_contents('php://input'), true);

$idEntreprise = $data['idEntreprise'] ?? null;
$nomEntreprise = $data['nomEntreprise'] ?? '';
$acronymeEntreprise = $data['acronymeEntreprise'] ?? '';
$categorie = $data['categorie'] ?? '';
$pays = $data['pays'] ?? '';
$ville = $data['ville'] ?? '';
$adresseCourte = $data['adresse'] ?? $data['adresseCourte'] ?? '';
$adresseComplete = $data['adresse'] ?? $data['adresseComplete'] ?? '';

if (empty($idEntreprise) || empty($nomEntreprise) || empty($pays) || empty($ville)) {
    echo json_encode(['success' => false, 'error' => 'Tous les champs obligatoires sont requis.']);
    exit;
}

// Un directeur "client" ne peut modifier QUE sa propre entreprise (voir
// estDirecteurPlateforme() dans config/session.php, et desactiverEntreprise.php
// pour le détail du problème sans ce contrôle).
if (!estDirecteurPlateforme() && (int)($_SESSION['user']['idEntreprise'] ?? 0) !== (int)$idEntreprise) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé à cette entreprise.']);
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

// Vérifier qu'un autre nom d'entreprise identique n'existe pas déjà
$stmt = $bdd->prepare("SELECT idEntreprise FROM entreprise WHERE nomEntreprise = :nom AND idEntreprise != :id");
$stmt->bindParam(':nom', $nomEntreprise);
$stmt->bindParam(':id', $idEntreprise);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    echo json_encode(['success' => false, 'error' => 'Une autre entreprise porte déjà ce nom.']);
    exit;
}

try {
    $stmt = $bdd->prepare("UPDATE entreprise SET
        nomEntreprise = :nom,
        acronymeEntreprise = :acronyme,
        categorie = :categorie,
        pays = :pays,
        ville = :ville,
        adresse = :adresse,
        adresseComplete = :adresseComplete
        WHERE idEntreprise = :id");
    $stmt->bindParam(':nom', $nomEntreprise);
    $stmt->bindParam(':acronyme', $acronymeEntreprise);
    $stmt->bindParam(':categorie', $categorie);
    $stmt->bindParam(':pays', $pays);
    $stmt->bindParam(':ville', $ville);
    $stmt->bindParam(':adresse', $adresseCourte);
    $stmt->bindParam(':adresseComplete', $adresseComplete);
    $stmt->bindParam(':id', $idEntreprise);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Entreprise modifiée avec succès.']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la modification.']);
}
