<?php
require 'config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');
include_once 'connexionBDD.php';

if (isset($_GET['idCategorie'])) {
    $idCategorie = $_GET['idCategorie'];
    $stmt = $bdd->prepare("SELECT idSousCategorie, nomSousCategorie FROM souscategorie WHERE idCategorie = :idCategorie ORDER BY nomSousCategorie");
    $stmt->bindParam(':idCategorie', $idCategorie, PDO::PARAM_INT);
    $stmt->execute();
    $sousCategories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'sousCategories' => $sousCategories]);
    exit;
}
echo json_encode(['success' => true, 'sousCategories' => []]);
exit;
?>
