<?php
header('Content-Type: application/json');
require '../config/cors.php';
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/session.php';
startSecureSession();
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Non authentifié']);
    exit;
}

// Inclure la connexion à la base de données
require_once '../connexionBDD.php';

try {
    // Récupérer les données JSON
    $donnees = json_decode(file_get_contents('php://input'), true);
    $idNotification = $donnees['idNotification'] ?? 0;
    $idUtilisateur = $donnees['idUtilisateur'] ?? 0;
    $typeUtilisateur = $donnees['typeUtilisateur'] ?? 'utilisateur';

    if (!$idNotification || !$idUtilisateur) {
        echo json_encode([
            'succes' => false,
            'erreur' => 'Paramètres manquants'
        ]);
        exit;
    }

    // Pour les directeurs, permettre de marquer comme lues les notifications pertinentes
    if ($typeUtilisateur === 'directeur') {
        // Marquer la notification comme lue pour les directeurs (notifications importantes)
        $requete = "
            UPDATE notifications 
            SET lu = 1 
            WHERE idNotification = ?
        ";
        $preparation = $bdd->prepare($requete);
        $preparation->execute([$idNotification]);
    } else {
        // Pour les autres utilisateurs : marquer seulement si la notification leur appartient
        $requete = "
            UPDATE notifications 
            SET lu = 1 
            WHERE idNotification = ? AND idUtilisateur = ?
        ";
        $preparation = $bdd->prepare($requete);
        $preparation->execute([$idNotification, $idUtilisateur]);
    }

    if ($preparation->rowCount() > 0) {
        echo json_encode([
            'succes' => true,
            'message' => 'Notification marquée comme lue'
        ]);
    } else {
        echo json_encode([
            'succes' => false,
            'erreur' => 'Notification non trouvée ou déjà lue'
        ]);
    }

} catch (Exception $e) {
    error_log('Erreur markNotificationRead: ' . $e->getMessage());
    echo json_encode([
        'succes' => false,
        'erreur' => 'Erreur lors du marquage de la notification'
    ]);
}
?> 
