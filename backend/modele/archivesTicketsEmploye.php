<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
require_once '../connexionBDD.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Utilisateur non connecté.']);
    exit;
}

try {
    // Vérifier si l'utilisateur est un employé ou admin référent
    if (!isset($_SESSION['user']['idUtilisateur'])) {
        echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Seuls les employés et admins référents peuvent accéder à cette page.']);
        exit;
    }
    
    $idUtilisateur = $_SESSION['user']['idUtilisateur'];
    
    // Récupérer uniquement les archives des tickets de cet utilisateur
    $sql = "
        SELECT at.idTicketArchive, at.titre, at.description, at.statut, at.priorite, 
               at.dateCreation, at.categorie, at.sousCategorie, at.dateTicketCloture, 
               at.rapport, u.nomUtilisateur, u.prenomUtilisateur, 
               t.nomTechnicien, t.prenomTechnicien
        FROM archiveTicket at 
        JOIN utilisateur u ON at.idUtilisateur = u.idUtilisateur 
        LEFT JOIN techniciens t ON at.idTechnicien = t.idTechnicien
        WHERE at.idUtilisateur = :idUtilisateur
        ORDER BY at.dateTicketCloture DESC
    ";
    
    $stmt = $bdd->prepare($sql);
    $stmt->bindParam(':idUtilisateur', $idUtilisateur, PDO::PARAM_INT);
    $stmt->execute();
    
    $archives = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'archives' => $archives]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur.']);
}
?> 