<?php
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
require_once '../connexionBDD.php';

// Un technicien peut supprimer un ticket non assigné ou l'un des siens ; un
// employé (compte `utilisateur`, quel que soit roleEntreprise) peut supprimer
// l'un de ses propres tickets.
$user = $_SESSION['user'] ?? null;
$estTechnicien = $user && ($user['role'] ?? null) === 'technicien' && isset($user['idTechnicien']);
$idUtilisateurSession = $user['idUtilisateur'] ?? null;

if (!$user || (!$estTechnicien && !$idUtilisateurSession)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Non connecté ou non autorisé.']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$idTicket = $data['idTicket'] ?? null;

if (!$idTicket) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID du ticket manquant.']);
    exit;
}

try {
    $bdd->beginTransaction();

    $stmtCheck = $bdd->prepare("SELECT idTechnicien, idUtilisateur FROM ticket WHERE idTicket = :idTicket");
    $stmtCheck->bindParam(':idTicket', $idTicket, PDO::PARAM_INT);
    $stmtCheck->execute();
    $ticket = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$ticket) {
        $bdd->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Ticket introuvable.']);
        exit;
    }

    if ($estTechnicien) {
        if (!empty($ticket['idTechnicien']) && (int)$ticket['idTechnicien'] !== (int)$user['idTechnicien']) {
            $bdd->rollBack();
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Ce ticket est assigné à un autre technicien.']);
            exit;
        }
    } else {
        if ((int)$ticket['idUtilisateur'] !== (int)$idUtilisateurSession) {
            $bdd->rollBack();
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Vous ne pouvez supprimer que vos propres tickets.']);
            exit;
        }
    }

    // La table conversation est en MyISAM (pas de contrainte de clé étrangère,
    // donc pas de suppression en cascade) : on la vide explicitement.
    $suppConversation = $bdd->prepare("DELETE FROM conversation WHERE idTicket = :idTicket");
    $suppConversation->bindParam(':idTicket', $idTicket, PDO::PARAM_INT);
    $suppConversation->execute();

    // Calendrier, fichier, messagesLus, notifications, partagerTicket sont en
    // InnoDB avec ON DELETE CASCADE sur idTicket : supprimés automatiquement.
    $stmt = $bdd->prepare("DELETE FROM ticket WHERE idTicket = :idTicket");
    $stmt->bindParam(':idTicket', $idTicket, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        $bdd->rollBack();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Aucun ticket supprimé.']);
        exit;
    }

    $bdd->commit();
    echo json_encode(['success' => true, 'message' => 'Ticket supprimé avec succès.']);
} catch (PDOException $e) {
    $bdd->rollBack();
    error_log('Erreur suppression ticket: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur lors de la suppression.']);
}
