<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Cache-Control, Pragma");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
require_once '../connexionBDD.php';

// Vérifier si l'utilisateur est un technicien connecté
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['idTechnicien'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Technicien non connecté.']);
    exit;
}

$idTechnicien = $_SESSION['user']['idTechnicien'];

try {
    $sql = "
        SELECT at.idTicketArchive, at.titre, at.description, at.statut, at.priorite, at.categorie, at.sousCategorie,
               at.dateCreation, at.dateTicketCloture, at.rapport,
               u.nomUtilisateur, u.prenomUtilisateur
        FROM archiveTicket at
        JOIN utilisateur u ON at.idUtilisateur = u.idUtilisateur
        WHERE at.idTechnicien = :idTechnicien
        ORDER BY at.dateTicketCloture DESC
    ";
    $stmt = $bdd->prepare($sql);
    $stmt->bindParam(':idTechnicien', $idTechnicien, PDO::PARAM_INT);
    $stmt->execute();

    $rapports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'rapports' => $rapports]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
