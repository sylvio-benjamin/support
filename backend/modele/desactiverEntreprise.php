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
// Vérification de session pour les directeurs uniquement
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

// Vérifier que l'utilisateur est un directeur
if (!isset($_SESSION['user']['role']) || $_SESSION['user']['role'] !== 'directeur') {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès non autorisé - Directeur requis']);
    exit;
}

require '../connexionBDD.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $idEntreprise = $data['idEntreprise'] ?? null;
    $action = $data['action'] ?? null; // 'desactiver' ou 'activer'
    
    if (!$idEntreprise || !$action) {
        echo json_encode(['success' => false, 'error' => 'ID entreprise et action requis']);
        exit;
    }
    
    if (!in_array($action, ['desactiver', 'activer'])) {
        echo json_encode(['success' => false, 'error' => 'Action invalide']);
        exit;
    }
    
    try {
        $bdd->beginTransaction();
        
        $nouveauStatut = ($action === 'desactiver') ? 1 : 0;
        
        // Désactiver/activer l'entreprise
        $stmt = $bdd->prepare("UPDATE entreprise SET desactiver = :desactiver WHERE idEntreprise = :idEntreprise");
        $stmt->bindParam(':desactiver', $nouveauStatut, PDO::PARAM_INT);
        $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
        $stmt->execute();
        
        // Désactiver/activer tous les utilisateurs de cette entreprise
        $stmt = $bdd->prepare("UPDATE utilisateur SET desactiver = :desactiver WHERE idEntreprise = :idEntreprise");
        $stmt->bindParam(':desactiver', $nouveauStatut, PDO::PARAM_INT);
        $stmt->bindParam(':idEntreprise', $idEntreprise, PDO::PARAM_INT);
        $stmt->execute();
        
        $bdd->commit();
        
        $message = ($action === 'desactiver') ? 
            'Entreprise et tous ses utilisateurs désactivés avec succès' : 
            'Entreprise et tous ses utilisateurs activés avec succès';
        
        echo json_encode([
            'success' => true, 
            'message' => $message,
            'action' => $action,
            'idEntreprise' => $idEntreprise
        ]);
        
    } catch (PDOException $e) {
        $bdd->rollBack();
        echo json_encode([
            'success' => false, 
            'error' => 'Erreur de base de données: '
        ]);
    }
}
?> 