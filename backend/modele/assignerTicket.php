<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../connexionBDD.php';

// Vérification de la session et du rôle
$rolesAutorises = ['referent', 'technicien', 'directeur'];
if (
    !isset($_SESSION['user']) ||
    !isset($_SESSION['user']['role']) ||
    !in_array($_SESSION['user']['role'], $rolesAutorises) ||
    !isset($_SESSION['user']['idTechnicien'])
) {
    http_response_code(401);
    echo json_encode(['succes' => false, 'erreur' => 'Non connecté ou non technicien']);
    exit;
}

$idTechnicien = $_SESSION['user']['idTechnicien'];
$nomTechnicien = $_SESSION['user']['nom'] ?? 'Technicien';
$prenomTechnicien = $_SESSION['user']['prenom'] ?? '';

$donnees = json_decode(file_get_contents('php://input'), true);
if (!isset($donnees['idTicket'])) {
    echo json_encode(['succes' => false, 'erreur' => 'Ticket non spécifié']);
    exit;
}

$idTicket = intval($donnees['idTicket']);

try {
    // Commencer une transaction
    $bdd->beginTransaction();

    // Récupérer les informations du ticket avant assignation
    $requeteTicket = $bdd->prepare("SELECT idUtilisateur, titre FROM ticket WHERE idTicket = :idTicket");
    $requeteTicket->execute([':idTicket' => $idTicket]);
    $ticket = $requeteTicket->fetch(PDO::FETCH_ASSOC);

    if (!$ticket) {
        throw new Exception('Ticket non trouvé');
    }

    // Assigner seulement si le ticket n'a pas déjà de technicien
    $requeteAssignation = $bdd->prepare("UPDATE ticket SET idTechnicien = :idTechnicien,dateTicketAssigné= CURRENT_TIMESTAMP, statut = 'en_cours' WHERE idTicket = :idTicket AND (idTechnicien IS NULL OR idTechnicien = 0)");
    $requeteAssignation->execute([
        ':idTechnicien' => $idTechnicien,
        ':idTicket' => $idTicket
    ]);
    
    if ($requeteAssignation->rowCount() > 0) {
        // Créer une notification pour l'utilisateur du ticket
        $requeteNotification = $bdd->prepare("
            INSERT INTO notifications 
            (idUtilisateur, idTicket, type, titre, message, idExpediteur, nomExpediteur, prenomExpediteur) 
            VALUES 
            (:idUtilisateur, :idTicket, 'assignation_technicien', :titre, :message, :idExpediteur, :nomExpediteur, :prenomExpediteur)
        ");
        
        $requeteNotification->execute([
            ':idUtilisateur' => $ticket['idUtilisateur'],
            ':idTicket' => $idTicket,
            ':titre' => 'Technicien assigné à votre ticket',
            ':message' => $prenomTechnicien . ' ' . $nomTechnicien . ' a été assigné à votre ticket "' . $ticket['titre'] . '"',
            ':idExpediteur' => $idTechnicien,
            ':nomExpediteur' => $nomTechnicien,
            ':prenomExpediteur' => $prenomTechnicien
        ]);

        // Confirmer la transaction
        $bdd->commit();
        
        echo json_encode(['succes' => true, 'message' => 'Ticket assigné et notification créée']);
    } else {
        $bdd->rollback();
        echo json_encode(['succes' => false, 'erreur' => 'Ticket déjà assigné à quelqu\'un']);
    }
} catch (Exception $e) {
    $bdd->rollback();
    echo json_encode(['succes' => false, 'erreur' => 'Erreur.']);
}
