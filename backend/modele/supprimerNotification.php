<?php
header('Content-Type: application/json');
require '../config/cors.php';
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
error_log('=== DEBUT supprimerNotification.php ===');
error_log('Session user: ' . print_r($_SESSION['user'] ?? 'NULL', true));

// Vérifier que l'utilisateur est connecté et est un directeur
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'directeur') {
    error_log('Accès non autorisé - Session user: ' . print_r($_SESSION['user'] ?? 'NULL', true));
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_log('Méthode non autorisée: ' . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

try {
    error_log('Tentative de connexion à la base de données...');
    require_once '../connexionBDD.php';
    error_log('Connexion BDD réussie');
    
    $input = json_decode(file_get_contents('php://input'), true);
    error_log('Input reçu: ' . print_r($input, true));
    
    if (!isset($input['idNotification']) || !is_numeric($input['idNotification'])) {
        error_log('ID de notification invalide: ' . ($input['idNotification'] ?? 'NULL'));
        echo json_encode(['success' => false, 'error' => 'ID de notification invalide']);
        exit;
    }
    
    $idNotification = intval($input['idNotification']);
    $idDirecteur = $_SESSION['user']['idTechnicien'];
    error_log("ID Notification: $idNotification, ID Directeur: $idDirecteur");
    
    // Vérifier d'abord si la notification existe
    error_log('Vérification existence notification...');
    $stmt = $bdd->prepare("SELECT * FROM notifications WHERE idNotification = ?");
    $stmt->execute([$idNotification]);
    $notification = $stmt->fetch(PDO::FETCH_ASSOC);
    error_log('Notification trouvée: ' . print_r($notification, true));
    
    if (!$notification) {
        error_log('Notification non trouvée pour ID: ' . $idNotification);
        echo json_encode(['success' => false, 'error' => 'Notification non trouvée']);
        exit;
    }
    
    // Pour les directeurs, on permet la suppression de toutes les notifications
    // car ils ont accès à toutes les notifications de leur organisation
    // Si on veut plus de sécurité, on peut ajouter des vérifications supplémentaires
    
    // Supprimer la notification
    error_log('Tentative de suppression de la notification...');
    $stmt = $bdd->prepare("DELETE FROM notifications WHERE idNotification = ?");
    $result = $stmt->execute([$idNotification]);
    error_log('Résultat suppression: ' . ($result ? 'SUCCESS' : 'FAILED'));
    
    if ($result) {
        error_log('Notification supprimée avec succès');
        echo json_encode(['success' => true, 'message' => 'Notification supprimée avec succès']);
    } else {
        error_log('Erreur lors de la suppression - Erreur SQL: ' . print_r($stmt->errorInfo(), true));
        echo json_encode(['success' => false, 'error' => 'Erreur lors de la suppression']);
    }
    
} catch (PDOException $e) {
    error_log("Erreur PDO suppression notification: " . $e->getMessage());
    error_log("Trace: " . $e->getTraceAsString());
    echo json_encode(['success' => false, 'error' => 'Erreur base de données']);
} catch (Exception $e) {
    error_log("Erreur suppression notification: " . $e->getMessage());
    error_log("Trace: " . $e->getTraceAsString());
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}

error_log('=== FIN supprimerNotification.php ===');
?> 