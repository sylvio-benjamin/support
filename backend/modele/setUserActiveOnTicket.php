<?php
require_once __DIR__ . '/../config/session.php';
startSecureSession();
require '../config/cors.php';
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// N'existait auparavant aucune vérification de session, et idUtilisateur
// venait du corps JSON : n'importe quel appelant anonyme pouvait marquer
// N'IMPORTE QUEL idUtilisateur comme "actif" sur N'IMPORTE QUEL ticket — ce
// qui supprime silencieusement ses notifications (voir la vérification
// `destinataireActif` dans saveChatMessage.php).
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['succes' => false, 'erreur' => 'Non authentifié']);
    exit;
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    error_log("setUserActiveOnTicket - Input reçu: " . $input);
    error_log("setUserActiveOnTicket - Data décodé: " . print_r($data, true));

    if (!$data || !isset($data['idTicket']) || !isset($data['isActive'])) {
        error_log("setUserActiveOnTicket - Paramètres manquants dans: " . print_r($data, true));
        throw new Exception('Paramètres manquants: idTicket et isActive requis');
    }

    // idUtilisateur dérivé de la SESSION : on ne peut déclarer actif que
    // soi-même, jamais un autre idUtilisateur/idTechnicien arbitraire.
    $idUtilisateur = (int)($_SESSION['user']['idUtilisateur'] ?? $_SESSION['user']['idTechnicien'] ?? 0);
    $idTicket = (int)$data['idTicket'];
    $isActive = (bool)$data['isActive'];

    if (!$idUtilisateur) {
        echo json_encode(['succes' => false, 'erreur' => 'Session invalide.']);
        exit;
    }

    require_once __DIR__ . '/../connexionBDD.php';
    
    // Créer une table temporaire pour tracker l'activité (si elle n'existe pas)
    $createTable = "CREATE TABLE IF NOT EXISTS user_activity_tracker (
        idUtilisateur INT,
        idTicket INT,
        lastActivity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (idUtilisateur, idTicket)
    )";
    $bdd->exec($createTable);
    
    if ($isActive) {
        // Marquer l'utilisateur comme actif sur ce ticket
        $query = "INSERT INTO user_activity_tracker (idUtilisateur, idTicket) 
                  VALUES (?, ?) 
                  ON DUPLICATE KEY UPDATE lastActivity = CURRENT_TIMESTAMP";
        $stmt = $bdd->prepare($query);
        $stmt->execute([$idUtilisateur, $idTicket]);
        error_log("Utilisateur $idUtilisateur marqué comme ACTIF sur ticket $idTicket");
    } else {
        // Retirer complètement l'utilisateur de l'activité sur ce ticket
        $query = "DELETE FROM user_activity_tracker WHERE idUtilisateur = ? AND idTicket = ?";
        $stmt = $bdd->prepare($query);
        $stmt->execute([$idUtilisateur, $idTicket]);
        error_log("Utilisateur $idUtilisateur marqué comme INACTIF (supprimé) sur ticket $idTicket");
    }
    
    // Vérifier combien d'entrées restent pour cet utilisateur
    $queryCheck = "SELECT COUNT(*) as count FROM user_activity_tracker WHERE idUtilisateur = ?";
    $stmtCheck = $bdd->prepare($queryCheck);
    $stmtCheck->execute([$idUtilisateur]);
    $countResult = $stmtCheck->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'succes' => true,
        'message' => $isActive ? 'Utilisateur marqué comme actif' : 'Utilisateur retiré de l\'activité',
        'debug' => [
            'idUtilisateur' => $idUtilisateur,
            'idTicket' => $idTicket,
            'isActive' => $isActive,
            'totalEntriesUser' => $countResult['count']
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'succes' => false,
        'erreur' => 'Erreur: '
    ]);
}
?> 