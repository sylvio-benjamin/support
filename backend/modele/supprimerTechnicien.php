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

// Vérifier si l'utilisateur est connecté et est un directeur
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['role']) || $_SESSION['user']['role'] !== 'directeur') {
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé']);
    exit;
}

// Vérifier si l'ID du technicien est fourni
$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['idTechnicien']) || !is_numeric($input['idTechnicien'])) {
    echo json_encode(['success' => false, 'error' => 'ID du technicien invalide']);
    exit;
}

$idTechnicien = (int)$input['idTechnicien'];

try {
    // Utiliser la connexion existante
    require_once '../connexionBDD.php';
    
    // Vérifier si le technicien existe
    $stmt = $bdd->prepare("SELECT * FROM techniciens WHERE idTechnicien = :id");
    $stmt->bindParam(':id', $idTechnicien);
    $stmt->execute();
    $technicien = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$technicien) {
        echo json_encode(['success' => false, 'error' => 'Technicien non trouvé']);
        exit;
    }
    
    // Empêcher la suppression d'un directeur
    if ($technicien['role'] === 'directeur') {
        echo json_encode(['success' => false, 'error' => 'Impossible de supprimer un directeur']);
        exit;
    }
    
    // Empêcher l'auto-suppression
    if ($technicien['idTechnicien'] == $_SESSION['user']['idTechnicien']) {
        echo json_encode(['success' => false, 'error' => 'Impossible de vous supprimer vous-même']);
        exit;
    }

    try {
        // Commencer une transaction
        $bdd->beginTransaction();
        
        // Désactiver temporairement les vérifications de clés étrangères
        $bdd->exec("SET FOREIGN_KEY_CHECKS = 0");
        
        // 1. Supprimer les rôles du technicien (table roleTechnicien)
        $stmt = $bdd->prepare("DELETE FROM roleTechnicien WHERE idTechnicien = :id");
        $stmt->bindParam(':id', $idTechnicien);
        $stmt->execute();
        
        // 2. Supprimer le technicien directement
        $stmt = $bdd->prepare("DELETE FROM techniciens WHERE idTechnicien = :id");
        $stmt->bindParam(':id', $idTechnicien);
        $stmt->execute();
        
        // Réactiver les vérifications de clés étrangères
        $bdd->exec("SET FOREIGN_KEY_CHECKS = 1");
        
        // Valider la transaction
        $bdd->commit();
        
        echo json_encode(['success' => true, 'message' => 'Technicien supprimé avec succès']);
        
    } catch (PDOException $e) {
        // Réactiver les vérifications de clés étrangères en cas d'erreur
        $bdd->exec("SET FOREIGN_KEY_CHECKS = 1");
        // Annuler la transaction en cas d'erreur
        $bdd->rollBack();
        echo json_encode(['success' => false, 'error' => 'Erreur lors de la suppression.']);
    } catch (Exception $e) {
        // Réactiver les vérifications de clés étrangères en cas d'erreur
        $bdd->exec("SET FOREIGN_KEY_CHECKS = 1");
        // Annuler la transaction en cas d'erreur
        $bdd->rollBack();
        echo json_encode(['success' => false, 'error' => 'Une erreur est survenue.']);
    }
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de connexion à la base de données.']);
}
?> 