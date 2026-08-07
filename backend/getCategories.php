<?php
require 'config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');
include_once 'connexionBDD.php';

$stmt = $bdd->prepare("SELECT idCategorie, nomCategorie FROM categorie ORDER BY nomCategorie");
$stmt->execute();
$categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(['success' => true, 'categories' => $categories]);
?>
