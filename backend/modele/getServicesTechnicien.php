<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
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

// Récupérer l'ID du technicien depuis les paramètres GET
$idTechnicien = $_GET['idTechnicien'] ?? 0;

if (!$idTechnicien) {
    echo json_encode(['success' => false, 'error' => 'ID technicien requis']);
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
    
    // Récupérer les services actuels du technicien
    $stmt = $bdd->prepare("
        SELECT s.idService, s.nomService 
        FROM services s 
        INNER JOIN roleTechnicien rt ON s.idService = rt.idService 
        WHERE rt.idTechnicien = :idTech
        ORDER BY s.nomService
    ");
    $stmt->bindParam(':idTech', $idTechnicien);
    $stmt->execute();
    $servicesActuels = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Récupérer tous les services disponibles
    $stmt = $bdd->prepare("SELECT idService, nomService FROM services ORDER BY nomService");
    $stmt->execute();
    $tousServices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Récupérer les services non assignés
    $stmt = $bdd->prepare("
        SELECT s.idService, s.nomService 
        FROM services s 
        WHERE s.idService NOT IN (
            SELECT rt.idService 
            FROM roleTechnicien rt 
            WHERE rt.idTechnicien = :idTech
        )
        ORDER BY s.nomService
    ");
    $stmt->bindParam(':idTech', $idTechnicien);
    $stmt->execute();
    $servicesDisponibles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'technicien' => [
            'idTechnicien' => $technicien['idTechnicien'],
            'nom' => $technicien['nomTechnicien'],
            'prenom' => $technicien['prenomTechnicien'],
            'role' => $technicien['role']
        ],
        'servicesActuels' => $servicesActuels,
        'servicesDisponibles' => $servicesDisponibles,
        'tousServices' => $tousServices
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la récupération.']);
}
?> 