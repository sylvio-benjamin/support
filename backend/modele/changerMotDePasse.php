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
require_once '../connexionBDD.php';

// Compte cible TOUJOURS dérivé de la session, jamais d'un id fourni par le
// client (même raisonnement que uploadPhotoProfil.php / profil.php).
$idUtilisateur = $_SESSION['user']['idUtilisateur'] ?? null;
$idTechnicien = $_SESSION['user']['idTechnicien'] ?? null;
$idDirecteur = $_SESSION['user']['idDirecteur'] ?? null;

if (!$idUtilisateur && !$idTechnicien && !$idDirecteur) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Utilisateur non connecté']);
    exit();
}

$donnees = json_decode(file_get_contents('php://input'), true);
$motDePasseActuel = $donnees['motDePasseActuel'] ?? '';
$nouveauMotDePasse = $donnees['nouveauMotDePasse'] ?? '';

if ($motDePasseActuel === '' || $nouveauMotDePasse === '') {
    echo json_encode(['success' => false, 'error' => 'Mot de passe actuel et nouveau mot de passe requis.']);
    exit();
}

if (strlen($nouveauMotDePasse) < 8) {
    echo json_encode(['success' => false, 'error' => 'Le nouveau mot de passe doit contenir au moins 8 caractères.']);
    exit();
}

if ($idUtilisateur) {
    $table = 'utilisateur';
    $colonneId = 'idUtilisateur';
    $colonnePassword = 'motDePasseUtilisateur';
    $id = $idUtilisateur;
} elseif ($idTechnicien) {
    $table = 'techniciens';
    $colonneId = 'idTechnicien';
    $colonnePassword = 'motDePasse';
    $id = $idTechnicien;
} else {
    $table = 'directeurs';
    $colonneId = 'idDirecteur';
    $colonnePassword = 'motDePasse';
    $id = $idDirecteur;
}

try {
    $stmt = $bdd->prepare("SELECT $colonnePassword AS hash FROM $table WHERE $colonneId = ?");
    $stmt->execute([$id]);
    $ligne = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$ligne || !password_verify($motDePasseActuel, $ligne['hash'])) {
        echo json_encode(['success' => false, 'error' => 'Mot de passe actuel incorrect.']);
        exit();
    }

    $nouveauHash = password_hash($nouveauMotDePasse, PASSWORD_DEFAULT);
    if ($table === 'utilisateur' || $table === 'techniciens') {
        // Lève l'obligation de changement de mot de passe imposée à la
        // création du compte (cf. inscriptionUtilisateur.php / inscriptionTechniciens.php).
        // La table "directeurs" (legacy, distincte de techniciens) n'a pas
        // cette colonne — jamais créée via un endpoint qui la positionne.
        $update = $bdd->prepare("UPDATE $table SET $colonnePassword = ?, doitChangerMotDePasse = 0 WHERE $colonneId = ?");
    } else {
        $update = $bdd->prepare("UPDATE $table SET $colonnePassword = ? WHERE $colonneId = ?");
    }
    $update->execute([$nouveauHash, $id]);

    echo json_encode(['success' => true, 'message' => 'Mot de passe mis à jour avec succès.']);
} catch (PDOException $e) {
    error_log('changerMotDePasse.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur.']);
}
