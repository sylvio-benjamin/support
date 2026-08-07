<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();

// Vérifier si l'utilisateur est connecté et est un directeur
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['role']) || $_SESSION['user']['role'] !== 'directeur') {
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé']);
    exit;
}

// Utiliser la connexion existante
require_once '../connexionBDD.php';

// Récupérer les données JSON
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$idTechnicien = $input['idTechnicien'] ?? 0;
$idService = $input['idService'] ?? 0;

if (!$idTechnicien || !$idService) {
    echo json_encode(['success' => false, 'error' => 'ID technicien et ID service requis']);
    exit;
}

try {
    // Vérifier si le technicien existe
    $stmt = $bdd->prepare("SELECT * FROM techniciens WHERE idTechnicien = :id");
    $stmt->bindParam(':id', $idTechnicien);
    $stmt->execute();
    $technicien = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$technicien) {
        echo json_encode(['success' => false, 'error' => 'Technicien non trouvé']);
        exit;
    }
    
    // Vérifier si le service existe
    $stmt = $bdd->prepare("SELECT * FROM services WHERE idService = :id");
    $stmt->bindParam(':id', $idService);
    $stmt->execute();
    $service = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$service) {
        echo json_encode(['success' => false, 'error' => 'Service non trouvé']);
        exit;
    }

    if ($action === 'ajouter') {
        // Vérifier si le service n'est pas déjà assigné
        $stmt = $bdd->prepare("SELECT COUNT(*) as count FROM roleTechnicien WHERE idTechnicien = :idTech AND idService = :idService");
        $stmt->bindParam(':idTech', $idTechnicien);
        $stmt->bindParam(':idService', $idService);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            echo json_encode(['success' => false, 'error' => 'Ce service est déjà assigné à ce technicien']);
            exit;
        }
        
        // Ajouter le service
        $stmt = $bdd->prepare("INSERT INTO roleTechnicien (idTechnicien, idService) VALUES (:idTech, :idService)");
        $stmt->bindParam(':idTech', $idTechnicien);
        $stmt->bindParam(':idService', $idService);
        $stmt->execute();
        
        echo json_encode(['success' => true, 'message' => 'Service ajouté avec succès']);
        
    } elseif ($action === 'supprimer') {
        // Supprimer le service
        $stmt = $bdd->prepare("DELETE FROM roleTechnicien WHERE idTechnicien = :idTech AND idService = :idService");
        $stmt->bindParam(':idTech', $idTechnicien);
        $stmt->bindParam(':idService', $idService);
        $stmt->execute();
        
        echo json_encode(['success' => true, 'message' => 'Service supprimé avec succès']);
        
    } else {
        echo json_encode(['success' => false, 'error' => 'Action invalide']);
    }
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la modification.']);
}
?> 