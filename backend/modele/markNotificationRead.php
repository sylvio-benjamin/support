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

    // idUtilisateur/typeUtilisateur sont dérivés de la SESSION, jamais du corps
    // envoyé par le client (sinon n'importe quel compte authentifié peut
    // marquer comme lue une notification de n'importe qui d'autre — IDOR
    // confirmé par cybersecurity/rapports/idor_notifications.md).
    // estDirecteurPlateforme() distingue un directeur interne (plateforme)
    // d'un directeur "client" (une seule entreprise) — voir config/session.php.
    $sessionUser = $_SESSION['user'];
    if (estDirecteurPlateforme()) {
        $idUtilisateur = $sessionUser['idDirecteur'] ?? $sessionUser['idTechnicien'] ?? $sessionUser['idUtilisateur'] ?? 0;
        $typeUtilisateur = 'directeur';
    } elseif (isset($sessionUser['idTechnicien'])) {
        $idUtilisateur = $sessionUser['idTechnicien'];
        $typeUtilisateur = 'technicien';
    } else {
        $idUtilisateur = $sessionUser['idUtilisateur'] ?? 0;
        $typeUtilisateur = 'utilisateur';
    }

    // Un tableau lié en paramètre PDO déclenche un warning "Array to string
    // conversion" (PDO émule les requêtes préparées par défaut) que
    // display_errors renvoie en clair dans la réponse HTTP.
    if (!is_scalar($idNotification)) {
        http_response_code(400);
        echo json_encode(['succes' => false, 'erreur' => 'Paramètres invalides']);
        exit;
    }

    if (!$idNotification || !$idUtilisateur) {
        echo json_encode([
            'succes' => false,
            'erreur' => 'Paramètres manquants'
        ]);
        exit;
    }

    // Un directeur plateforme a une vue GLOBALE (voir getNotifications.php :
    // aucun filtre idTechnicien pour ce rôle) — il doit donc pouvoir marquer
    // comme lue n'importe quelle notification, pas seulement celles qui lui
    // sont adressées directement. Sans ce cas séparé, la condition
    // idTechnicien = son propre id ne correspond quasiment jamais (la
    // notification appartient au technicien concerné), la mise à jour ne
    // touche aucune ligne, et la notification réapparaît indéfiniment au
    // rafraîchissement suivant malgré la disparition optimiste côté client.
    if ($typeUtilisateur === 'directeur') {
        $requete = "UPDATE notifications SET lu = 1 WHERE idNotification = ?";
        $preparation = $bdd->prepare($requete);
        $preparation->execute([$idNotification]);
    } elseif ($typeUtilisateur === 'technicien') {
        // Un technicien voit (getNotifications.php) les notifications qui lui
        // sont adressées directement (idTechnicien) MAIS AUSSI celles liées à
        // un ticket qui lui est actuellement assigné (t.idTechnicien), même si
        // la notification elle-même a été créée pour quelqu'un d'autre (ex :
        // ticket réassigné après l'envoi de la notif). Sans le second cas, ces
        // notifications ne pouvaient jamais être marquées comme lues (0 ligne
        // affectée) et réapparaissaient indéfiniment, faussant le compteur.
        $requete = "
            UPDATE notifications n
            LEFT JOIN ticket t ON n.idTicket = t.idTicket
            SET n.lu = 1
            WHERE n.idNotification = ? AND (n.idTechnicien = ? OR t.idTechnicien = ?)
        ";
        $preparation = $bdd->prepare($requete);
        $preparation->execute([$idNotification, $idUtilisateur, $idUtilisateur]);
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
