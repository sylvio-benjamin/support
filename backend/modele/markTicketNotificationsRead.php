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

try {
    // Récupérer les données JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    error_log('Données reçues: ' . print_r($data, true));
    
    if (!$data || !isset($data['idTicket']) || !isset($data['idUtilisateur'])) {
        throw new Exception('Données manquantes: idTicket et idUtilisateur requis');
    }
    
    $idTicket = (int)$data['idTicket'];
    $idUtilisateur = (int)$data['idUtilisateur'];
    
    require __DIR__ . '/../connexionBDD.php';
    
    // Marquer toutes les notifications non lues de ce ticket pour cet utilisateur comme lues
    $requete = "UPDATE notifications 
                SET lu = 1 
                WHERE idTicket = ? 
                AND idUtilisateur = ? 
                AND lu = 0";
    
    $preparation = $bdd->prepare($requete);
    $resultat = $preparation->execute([$idTicket, $idUtilisateur]);
    
    if ($resultat) {
        $nombreMisAJour = $preparation->rowCount();
        error_log("Notifications marquées comme lues: $nombreMisAJour pour ticket $idTicket, utilisateur $idUtilisateur");
        
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