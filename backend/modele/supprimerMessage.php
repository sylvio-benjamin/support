<?php
// Suppression "pour tout le monde" (façon WhatsApp) : le message n'est pas
// effacé de la base, il est vidé et marqué estSupprime — les autres
// participants du ticket voient un placeholder "Message supprimé" à la place
// du contenu, plutôt qu'une disparition totale sans trace.
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/csrf.php';
startSecureSession();
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['succes' => false, 'erreur' => 'Non authentifié']);
    exit;
}

verifierTokenCsrf();

require_once __DIR__ . '/../connexionBDD.php';

$donnees = json_decode(file_get_contents('php://input'), true);
$idMessage = isset($donnees['idMessage']) ? (int)$donnees['idMessage'] : 0;

if (!$idMessage) {
    echo json_encode(['succes' => false, 'erreur' => 'Paramètres manquants']);
    exit;
}

$sessionUser = $_SESSION['user'];
// idExpediteur/typeExpediteur dérivés de la SESSION, jamais du corps envoyé
// par le client : mêmes règles que modifierMessage.php.
$idExpediteurSession = isset($sessionUser['idTechnicien']) ? (int)$sessionUser['idTechnicien'] : (int)($sessionUser['idUtilisateur'] ?? 0);
$typeExpediteurSession = isset($sessionUser['idTechnicien']) ? 'technicien' : 'utilisateur';

try {
    $stmt = $bdd->prepare("SELECT idTicket, idExpediteur, typeExpediteur, estSupprime FROM conversation WHERE idMessage = ?");
    $stmt->execute([$idMessage]);
    $ligne = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$ligne) {
        http_response_code(404);
        echo json_encode(['succes' => false, 'erreur' => 'Message introuvable']);
        exit;
    }

    // Seul l'auteur du message peut le supprimer. typeExpediteur peut être
    // NULL sur un message antérieur à son ajout : dans ce cas on se limite à
    // la comparaison d'ID (même logique que modifierMessage.php).
    $estAuteur = (int)$ligne['idExpediteur'] === $idExpediteurSession
        && ($ligne['typeExpediteur'] === null || $ligne['typeExpediteur'] === $typeExpediteurSession);

    if (!$estAuteur) {
        http_response_code(403);
        echo json_encode(['succes' => false, 'erreur' => "Vous ne pouvez supprimer que vos propres messages."]);
        exit;
    }

    if ((int)$ligne['estSupprime'] === 1) {
        echo json_encode(['succes' => true, 'idTicket' => $ligne['idTicket']]);
        exit;
    }

    $bdd->beginTransaction();
    $stmtMaj = $bdd->prepare("UPDATE conversation SET message = '', fichierJoint = NULL, estSupprime = 1 WHERE idMessage = ?");
    $stmtMaj->execute([$idMessage]);
    // Les pièces jointes multiples ne doivent plus être servies non plus.
    $stmtFichiers = $bdd->prepare("DELETE FROM conversation_fichiers WHERE idMessage = ?");
    $stmtFichiers->execute([$idMessage]);
    $bdd->commit();

    echo json_encode(['succes' => true, 'idTicket' => $ligne['idTicket']]);
} catch (PDOException $e) {
    if ($bdd->inTransaction()) {
        $bdd->rollBack();
    }
    error_log('Erreur supprimerMessage: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['succes' => false, 'erreur' => 'Erreur serveur.']);
}
