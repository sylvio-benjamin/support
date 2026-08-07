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
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['succes' => false, 'erreur' => 'Non authentifié']);
    exit;
}

require_once __DIR__ . '/../connexionBDD.php';

$donnees = json_decode(file_get_contents('php://input'), true);
$idMessage = isset($donnees['idMessage']) ? (int)$donnees['idMessage'] : 0;
$nouveauMessage = isset($donnees['message']) ? trim($donnees['message']) : '';

if (!$idMessage || $nouveauMessage === '') {
    echo json_encode(['succes' => false, 'erreur' => 'Paramètres manquants']);
    exit;
}
if (mb_strlen($nouveauMessage) > 550) {
    echo json_encode(['succes' => false, 'erreur' => 'Message trop long (550 caractères maximum)']);
    exit;
}

$sessionUser = $_SESSION['user'];
// idExpediteur/typeExpediteur dérivés de la SESSION, jamais du corps envoyé
// par le client : mêmes règles que saveChatMessage.php.
$idExpediteurSession = isset($sessionUser['idTechnicien']) ? (int)$sessionUser['idTechnicien'] : (int)($sessionUser['idUtilisateur'] ?? 0);
$typeExpediteurSession = isset($sessionUser['idTechnicien']) ? 'technicien' : 'utilisateur';

try {
    $stmt = $bdd->prepare("SELECT idTicket, idExpediteur, typeExpediteur FROM conversation WHERE idMessage = ?");
    $stmt->execute([$idMessage]);
    $ligne = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$ligne) {
        http_response_code(404);
        echo json_encode(['succes' => false, 'erreur' => 'Message introuvable']);
        exit;
    }

    // Seul l'auteur du message peut le modifier. typeExpediteur peut être
    // NULL sur un message antérieur à son ajout (cf. saveChatMessage.php) :
    // dans ce cas on se limite à la comparaison d'ID, sinon on exige aussi
    // que le type corresponde (un idUtilisateur et un idTechnicien peuvent
    // porter la même valeur numérique pour deux personnes différentes).
    $estAuteur = (int)$ligne['idExpediteur'] === $idExpediteurSession
        && ($ligne['typeExpediteur'] === null || $ligne['typeExpediteur'] === $typeExpediteurSession);

    if (!$estAuteur) {
        http_response_code(403);
        echo json_encode(['succes' => false, 'erreur' => "Vous ne pouvez modifier que vos propres messages."]);
        exit;
    }

    $stmtMaj = $bdd->prepare("UPDATE conversation SET message = ?, dateModification = NOW() WHERE idMessage = ?");
    $stmtMaj->execute([$nouveauMessage, $idMessage]);

    $stmtLecture = $bdd->prepare("SELECT idMessage, idTicket, message, dateModification FROM conversation WHERE idMessage = ?");
    $stmtLecture->execute([$idMessage]);
    $messageMaj = $stmtLecture->fetch(PDO::FETCH_ASSOC);

    echo json_encode(['succes' => true, 'messageData' => $messageMaj]);
} catch (PDOException $e) {
    error_log('Erreur modifierMessage: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['succes' => false, 'erreur' => 'Erreur serveur.']);
}
