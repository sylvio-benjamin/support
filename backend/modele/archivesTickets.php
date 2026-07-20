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
require '../connexionBDD.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Utilisateur non connecté.']);
    exit;
}

try {
            // Construire la requête - tous les utilisateurs voient toutes les archives
            $sql = "
               SELECT at.idTicketArchive, at.titre, at.description, at.statut, at.priorite, at.dateCreation, at.categorie, at.sousCategorie, at.dateTicketCloture, at.rapport, u.nomUtilisateur, u.prenomUtilisateur, t.nomTechnicien, t.prenomTechnicien
               FROM archiveTicket at 
               JOIN utilisateur u ON at.idUtilisateur = u.idUtilisateur 
               LEFT JOIN techniciens t ON at.idTechnicien = t.idTechnicien
               ORDER BY at.dateTicketCloture DESC;
            ";
            $stmt = $bdd->prepare($sql);
            $stmt->execute();
    
    $archives = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'archives' => $archives]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
?> 