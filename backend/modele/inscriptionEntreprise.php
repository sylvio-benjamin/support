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

if (!isset($_SESSION['user']) || !isset($_SESSION['user']['role']) || $_SESSION['user']['role'] !== 'directeur') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Non autorisé.']);
    exit();
}

require '../connexionBDD.php';
$donnees = json_decode(file_get_contents('php://input'), true);
// Récupération des données POST
$nomEntreprise = $donnees['nomEntreprise'] ?? '';
$acronymeEntreprise = $donnees['acronymeEntreprise'] ?? '';
$categorie =$donnees['categorie'] ?? '';
$pays = $donnees['pays'] ?? '';
$ville = $donnees['ville'] ?? '';
$adresseCourte = $donnees['adresseCourte'] ?? '';
$adresseComplete =$donnees['adresseComplete'] ?? '';
// Vérification des champs obligatoires

if (empty($nomEntreprise) || empty($acronymeEntreprise) || empty($categorie) || empty($pays) || empty($ville)) {
    echo json_encode(['success' => false, 'error' => 'Tous les champs sont requis.']);
    exit;
}

// Vérifier si l'entreprise existe déjà
$stmt = $bdd->prepare("SELECT idEntreprise FROM entreprise WHERE nomEntreprise = :nomEntreprise" );
$stmt->bindParam(':nomEntreprise', $nomEntreprise);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    echo json_encode(['success' => false, 'error' => 'Cette entreprise existe déjà.']);
    exit;
}

// Insertion dans la base de données
$stmt = $bdd->prepare("INSERT INTO entreprise (nomEntreprise, acronymeEntreprise, categorie, pays, ville,adresse,adresseComplete) VALUES (:nomEntreprise, :acronymeEntreprise, :categorie, :pays, :ville, :adresse, :adresseComplete)");

$stmt->bindParam(':nomEntreprise', $nomEntreprise);
$stmt->bindParam(':acronymeEntreprise', $acronymeEntreprise);
$stmt->bindParam(':categorie', $categorie);
$stmt->bindParam(':pays', $pays);
$stmt->bindParam(':ville', $ville);
$stmt->bindParam(':adresse', $adresseCourte);
$stmt->bindParam(':adresseComplete', $adresseComplete);
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Entreprise enregistrée avec succès.']);
} else {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'enregistrement de l\'entreprise.']);
}
?>
