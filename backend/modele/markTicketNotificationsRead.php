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

error_log('=== DEBUT markTicketNotificationsRead.php ===');

// N'existait auparavant aucune vérification de session : n'importe quel
// appelant anonyme pouvait marquer comme lues les notifications de
// N'IMPORTE QUEL idUtilisateur sur N'IMPORTE QUEL ticket (idUtilisateur venait
// du corps JSON, jamais de la session). Confirmé exploitable par un simple
// curl anonyme.
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['succes' => false, 'erreur' => 'Non authentifié']);
    exit;
}

try {
    // Récupérer les données JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    error_log('Données reçues: ' . print_r($data, true));

    if (!$data || !isset($data['idTicket'])) {
        throw new Exception('Données manquantes: idTicket requis');
    }

    $idTicket = (int)$data['idTicket'];

    require_once __DIR__ . '/../config.php';
    require_once __DIR__ . '/../connexionBDD.php';

    // Rôle dérivé de la SESSION, jamais du corps envoyé par le client — même
    // logique que markNotificationRead.php. Un directeur plateforme a une vue
    // globale (voir getNotifications.php) donc marque n'importe quelle
    // notification du ticket ; un technicien/directeur "propriétaire" de
    // notification utilise la colonne idTechnicien ; un employé/admin utilise
    // idUtilisateur.
    $sessionUser = $_SESSION['user'];
    if (estDirecteurPlateforme()) {
        $requete = "UPDATE notifications SET lu = 1 WHERE idTicket = ? AND lu = 0";
        $preparation = $bdd->prepare($requete);
        $resultat = $preparation->execute([$idTicket]);
    } elseif (isset($sessionUser['idTechnicien'])) {
        $requete = "UPDATE notifications SET lu = 1 WHERE idTicket = ? AND idTechnicien = ? AND lu = 0";
        $preparation = $bdd->prepare($requete);
        $resultat = $preparation->execute([$idTicket, (int)$sessionUser['idTechnicien']]);
    } else {
        $idUtilisateur = (int)($sessionUser['idUtilisateur'] ?? 0);
        if (!$idUtilisateur) {
            echo json_encode(['succes' => false, 'erreur' => 'Session invalide.']);
            exit;
        }
        $requete = "UPDATE notifications SET lu = 1 WHERE idTicket = ? AND idUtilisateur = ? AND lu = 0";
        $preparation = $bdd->prepare($requete);
        $resultat = $preparation->execute([$idTicket, $idUtilisateur]);
    }
    
    if ($resultat) {
        $nombreMisAJour = $preparation->rowCount();
        error_log("Notifications marquées comme lues: $nombreMisAJour pour ticket $idTicket");

        echo json_encode([
            'succes' => true,
            'message' => 'Notifications du ticket marquées comme lues',
            'nombreMisAJour' => $nombreMisAJour
        ]);
    } else {
        throw new Exception('Erreur lors de la mise à jour des notifications');
    }

} catch (Exception $e) {
    error_log('ERREUR markTicketNotificationsRead: ' . $e->getMessage());
    echo json_encode([
        'succes' => false,
        'erreur' => 'Erreur lors du marquage des notifications: '
    ]);
}

error_log('=== FIN markTicketNotificationsRead.php ===');
?> 