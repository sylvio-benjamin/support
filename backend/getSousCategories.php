<?php
require 'config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');
include 'connexionBDD.php';

if (isset($_GET['categorie'])) {
    $categorie = $_GET['categorie'];
    $stmt = $bdd->prepare("SELECT nomSousCategorie FROM souscategorie WHERE CONVERT(nomCategorie USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci");
    $stmt->execute([$categorie]);
    $sousCategories = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode($sousCategories);
    exit;
}
echo json_encode([]);
exit;
?> 