<?php
header('Content-Type: application/json; charset=utf-8');
require '../config/cors.php';
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../connexionBDD.php';

try {
    // Récupérer les données POST
    $input = json_decode(file_get_contents('php://input'), true);
    $idTicket = $input['idTicket'] ?? null;
    
    // Récupérer les infos utilisateur depuis la session
    $user = $_SESSION['user'] ?? null;
    if (!$user) {
        echo json_encode([
            'success' => false, 
            'error' => 'Utilisateur non connecté'
        ]);
        exit;
    }
    
    $role = $user['role'] ?? '';
    $idUtilisateur = null;
    $idTechnicien = null;
    $typeUtilisateur = '';
    
    // Déterminer le type d'utilisateur et les IDs
    if ($role === 'employe' || $role === 'utilisateur') {
        $idUtilisateur = $user['idUtilisateur'] ?? null;
        $typeUtilisateur = 'utilisateur';
    } else if ($role === 'technicien') {
        $idTechnicien = $user['idTechnicien'] ?? null;
        $typeUtilisateur = 'technicien';
    } else if ($role === 'directeur') {
        $idTechnicien = $user['idTechnicien'] ?? null;
        $typeUtilisateur = 'directeur';
    } else if ($role === 'admin' || $role === 'referent') {
        $idTechnicien = $user['idTechnicien'] ?? null;
        $typeUtilisateur = 'admin';
    }

    if (!$idTicket || (!$idUtilisateur && !$idTechnicien)) {
        echo json_encode([
            'success' => false, 
            'error' => 'Paramètres manquants',
            'debug' => [
                'idTicket' => $idTicket,
                'idUtilisateur' => $idUtilisateur,
                'idTechnicien' => $idTechnicien,
                'typeUtilisateur' => $typeUtilisateur,
                'role' => $role,
                'session_user' => $user
            ]
        ]);
        exit;
    }

    // Vérifier si la table messagesLus existe, sinon la créer
    $checkTable = $bdd->query("SHOW TABLES LIKE 'messagesLus'");
    if ($checkTable->rowCount() == 0) {
        $createTable = $bdd->exec("
            CREATE TABLE messagesLus (
                id INT AUTO_INCREMENT PRIMARY KEY,
                idTicket INT NOT NULL,
                idUtilisateur INT NOT NULL,
                idTechnicien INT NULL,
                typeUtilisateur ENUM('utilisateur', 'technicien', 'directeur', 'admin') NOT NULL,
                dateLecture TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_lecture (idTicket, idUtilisateur, typeUtilisateur),
                FOREIGN KEY (idTicket) REFERENCES ticket(idTicket) ON DELETE CASCADE
            )
        ");
        
        if (!$createTable) {
            echo json_encode(['success' => false, 'error' => 'Erreur création table messagesLus']);
            exit;
        }
    }

    // Insérer ou mettre à jour l'enregistrement de lecture
    $stmt = $bdd->prepare("
        INSERT INTO messagesLus (idTicket, idUtilisateur, idTechnicien, typeUtilisateur, dateLecture) 
        VALUES (:idTicket, :idUtilisateur, :idTechnicien, :typeUtilisateur, NOW())
        ON DUPLICATE KEY UPDATE dateLecture = NOW()
    ");
    
    $stmt->bindParam(':idTicket', $idTicket);
    $stmt->bindParam(':idUtilisateur', $idUtilisateur);
    $stmt->bindParam(':idTechnicien', $idTechnicien);
    $stmt->bindParam(':typeUtilisateur', $typeUtilisateur);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true, 
            'message' => 'Messages marqués comme lus',
            'data' => [
                'idTicket' => $idTicket,
                'idUtilisateur' => $idUtilisateur,
                'idTechnicien' => $idTechnicien,
                'typeUtilisateur' => $typeUtilisateur
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'insertion']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur base de données.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur.']);
}
?>