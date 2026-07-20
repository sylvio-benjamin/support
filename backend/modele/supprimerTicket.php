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
require '../connexionBDD.php';

if (
    !isset($_SESSION['user']) ||
    !isset($_SESSION['user']['role']) ||
    $_SESSION['user']['role'] !== 'technicien' ||
    !isset($_SESSION['user']['idTechnicien'])
) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Non connecté ou non autorisé.']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$idTicket = $data['idTicket'] ?? null;
$idTechnicien = $_SESSION['user']['idTechnicien'];

if (!$idTicket) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID du ticket manquant.']);
    exit;
}

try {
    $bdd->beginTransaction();

    // Un technicien peut supprimer un ticket non assigné, ou l'un de ses propres tickets
    $stmtCheck = $bdd->prepare("SELECT idTechnicien FROM ticket WHERE idTicket = :idTicket");
    $stmtCheck->bindParam(':idTicket', $idTicket, PDO::PARAM_INT);
    $stmtCheck->execute();
    $ticket = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$ticket) {
        $bdd->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Ticket introuvable.']);
        exit;
    }
    if (!empty($ticket['idTechnicien']) && (int)$ticket['idTechnicien'] !== (int)$idTechnicien) {
        $bdd->rollBack();
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Ce ticket est assigné à un autre technicien.']);
        exit;
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
