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

require '../connexionBDD.php';
require_once 'verifierDateExpi.php';
$data = json_decode(file_get_contents("php://input"), true);

$nouveauMotDePasse = $data['nouveauMotDePasse'] ?? null;
$token = $data['token'] ?? null;

if (!$token || !$nouveauMotDePasse) {
    http_response_code(400);
    echo json_encode(['error' => 'Token ou mot de passe manquant.']);
    exit();
}

if (strlen($nouveauMotDePasse) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Le mot de passe doit contenir au moins 8 caractères.']);
    exit();
}

expirerAnciensTokens();

try {
    // Le token doit avoir été créé au préalable par demanderReinitialisationMotDePasse.php
    // (jamais accepté/créé à la volée depuis la requête du client) et être encore valide.
    $query = $bdd->prepare("SELECT login, expire FROM reinitialiserMotDePasse WHERE idToken = ?");
    $query->execute([$token]);
    $resetEntry = $query->fetch();

    if ($resetEntry && (int)$resetEntry['expire'] === 0) {
        $login = $resetEntry['login'];

        $hashedPassword = password_hash($nouveauMotDePasse, PASSWORD_DEFAULT);

        $updatePassword = $bdd->prepare("UPDATE utilisateur SET motDePasseUtilisateur = ? WHERE loginUtilisateur = ?");
        $updatePassword->execute([$hashedPassword, $login]);

        // Le token est à usage unique : on l'invalide immédiatement après emploi.
        $invalidate = $bdd->prepare("UPDATE reinitialiserMotDePasse SET expire = 1 WHERE idToken = ?");
        $invalidate->execute([$token]);

        echo json_encode(['success' => true, 'message' => 'Mot de passe mis à jour avec succès.']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Lien invalide, expiré ou déjà utilisé.']);
    }

} catch (PDOException $e) {
    error_log('reinitialiserMotDePasse.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur lors de la réinitialisation du mot de passe.']);
}
