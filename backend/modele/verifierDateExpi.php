<?php

require_once '../connexionBDD.php';

// Marque comme expirés (expire = 1) les tokens de réinitialisation de mot de
// passe vieux de plus de 15 minutes. Ne produit aucune sortie : ce fichier
// est conçu pour être `require`-é par d'autres endpoints (reinitialiserMotDePasse.php,
// demanderReinitialisationMotDePasse.php) sans écrire dans leur réponse JSON.
function expirerAnciensTokens(): int {
    global $bdd;

    $query = $bdd->prepare("SELECT date, idToken FROM reinitialiserMotDePasse WHERE expire = 0");
    $query->execute();

    $resultats = $query->fetchAll();
    $now = new DateTime();
    $nbExpires = 0;

    foreach ($resultats as $row) {
        $dateCreation = new DateTime($row['date']);
        $interval = $now->getTimestamp() - $dateCreation->getTimestamp();

        if ($interval > 15 * 60) {
            $stmt = $bdd->prepare("UPDATE reinitialiserMotDePasse SET expire = 1 WHERE idToken = ?");
            $stmt->execute([$row['idToken']]);
            $nbExpires++;
        }
    }

    return $nbExpires;
}

// N'émet une réponse JSON que si ce fichier est appelé directement en tant
// qu'endpoint HTTP (et non via require depuis un autre script).
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    require '../config/cors.php';
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Credentials: true");
    header('Content-Type: application/json');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    $nbExpires = expirerAnciensTokens();
    echo json_encode([
        'status' => 'success',
        'message' => 'Expiration vérifiée',
        'tokensExpirés' => $nbExpires
    ]);
}
