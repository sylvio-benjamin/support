<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifie la session
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['role'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Utilisateur non connecté']);
    exit;
}

require __DIR__ . '/../connexionBDD.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $idService = $_GET['idService'] ?? null;
        
        if (!$idService) {
            // Si aucun service spécifié, retourner toutes les catégories et sous-catégories
            $stmtCategories = $bdd->prepare("SELECT DISTINCT nomCategorie FROM categorie ORDER BY nomCategorie");
            $stmtCategories->execute();
            $categories = $stmtCategories->fetchAll(PDO::FETCH_COLUMN);
            
            $stmtSousCategories = $bdd->prepare("
                SELECT nomSousCategorie, nomCategorie, idService 
                FROM souscategorie 
                ORDER BY nomCategorie, nomSousCategorie
            ");
            $stmtSousCategories->execute();
            $sousCategories = $stmtSousCategories->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true, 
                'categories' => $categories,
                'sousCategories' => $sousCategories
            ]);
        } else {
            // Filtrer par service
            $stmtCategories = $bdd->prepare("
                SELECT DISTINCT s.nomCategorie 
                FROM souscategorie s 
                WHERE s.idService = :idService 
                ORDER BY s.nomCategorie
            ");
            $stmtCategories->bindParam(':idService', $idService, PDO::PARAM_INT);
            $stmtCategories->execute();
            $categories = $stmtCategories->fetchAll(PDO::FETCH_COLUMN);
            
            $stmtSousCategories = $bdd->prepare("
                SELECT nomSousCategorie, nomCategorie, idService 
                FROM souscategorie 
                WHERE idService = :idService 
                ORDER BY nomCategorie, nomSousCategorie
            ");
            $stmtSousCategories->bindParam(':idService', $idService, PDO::PARAM_INT);
            $stmtSousCategories->execute();
            $sousCategories = $stmtSousCategories->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true, 
                'categories' => $categories,
                'sousCategories' => $sousCategories
            ]);
        }
        
    } catch (PDOException $erreur) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
    }
    exit;
}

// Si méthode non autorisée
http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
?> 