<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../connexionBDD.php';

// Vérifier si l'utilisateur est un admin référent connecté
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['role']) || ($_SESSION['user']['role'] !== 'referent' && $_SESSION['user']['role'] !== 'admin')) {
    echo json_encode(['success' => false, 'error' => 'Accès non autorisé. Admin référent non connecté.']);
    exit;
}

$idUtilisateur = $_SESSION['user']['idUtilisateur'] ?? null;

if (!$idUtilisateur) {
    echo json_encode(['success' => false, 'error' => 'Informations utilisateur manquantes.']);
    exit;
}

try {
    // Sélectionne uniquement les tickets créés par l'admin référent connecté
    $sql = "
        SELECT t.idTicket, t.titre, t.description, t.statut, t.priorite, t.dateCreation, t.categorie, t.sousCategorie, 
               u.nomUtilisateur, u.prenomUtilisateur,
               tech.nomTechnicien, tech.prenomTechnicien
        FROM ticket t 
        LEFT JOIN utilisateur u ON t.idUtilisateur = u.idUtilisateur 
        LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien 
        WHERE t.idUtilisateur = :idUtilisateur
        ORDER BY t.dateCreation DESC
    ";
  
    $stmt = $bdd->prepare($sql);
    $stmt->bindParam(':idUtilisateur', $idUtilisateur, PDO::PARAM_INT);
    $stmt->execute();
    
    $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'tickets' => $tickets]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur de base de données.']);
}
?> 