<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

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
    // Sélectionne tous les tickets assignés au technicien connecté, en excluant les tickets clôturés
    $sql = "
       SELECT t.idTicket, t.titre, t.description, t.statut, t.priorite, t.dateCreation, t.categorie, t.idTechnicien, t.sousCategorie, u.nomUtilisateur, u.prenomUtilisateur, e.nomEntreprise FROM ticket t LEFT JOIN partagerTicket pt ON pt.idTicket = t.idTicket JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur LEFT JOIN entreprise e ON u.idEntreprise = e.idEntreprise WHERE (t.idTechnicien = :idTechnicien OR pt.idTechnicien = :idTechnicien) AND t.statut NOT IN ('resolu', 'ferme') ORDER BY t.dateCreation DESC;
    ";
  
    $stmt = $bdd->prepare($sql);
    $stmt->bindParam(':idTechnicien', $idTechnicien, PDO::PARAM_INT);
    $stmt->execute();
    
    $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'tickets' => $tickets]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
?> 