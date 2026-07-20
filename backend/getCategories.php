<?php
require 'config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');
include 'connexionBDD.php';

$stmt = $bdd->prepare("SELECT nomCategorie FROM categorie");
$stmt->execute();
$categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo json_encode($categories);
?> 