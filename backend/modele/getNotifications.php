<?php
header('Content-Type: application/json');
require '../config/cors.php';
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
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

error_log('=== DEBUT getNotifications.php ===');

try {
    // Récupérer les données JSON
    $input = file_get_contents('php://input');
    error_log('Input reçu: ' . $input);
    
    $donnees = json_decode($input, true);
    error_log('Données décodées: ' . print_r($donnees, true));
    
    $idUtilisateur = $donnees['idUtilisateur'] ?? 0;
    $typeUtilisateur = $donnees['typeUtilisateur'] ?? 'utilisateur'; // 'utilisateur' ou 'technicien'
    error_log("ID Utilisateur demandé: $idUtilisateur, Type: $typeUtilisateur");

    if (!$idUtilisateur || $idUtilisateur <= 0) {
        echo json_encode([
            'succes' => false,
            'erreur' => 'ID utilisateur manquant ou invalide',
            'debug' => [
                'idUtilisateur' => $idUtilisateur,
                'typeUtilisateur' => $typeUtilisateur,
                'donnees' => $donnees
            ]
        ]);
        exit;
    }

    // Récupérer les notifications depuis la table notifications
    if ($typeUtilisateur === 'technicien') {
        // Pour un technicien : les notifications des tickets qui lui sont assignés,
        // plus les notifications qui lui sont adressées directement (ex: nouveau
        // ticket non encore assigné, ciblant son service ou tous les techniciens)
        $requeteNotifications = "
            SELECT
                n.idNotification as id,
                n.idTicket,
                n.idExpediteur,
                n.type,
                n.titre,
                n.message,
                n.dateCreation as dateEnvoi,
                n.lu as readStatus,
                n.nomExpediteur as nom,
                n.prenomExpediteur as prenom,
                t.titre as titreTicket,
                t.statut as statutTicket,
                t.priorite as prioriteTicket
            FROM notifications n
            INNER JOIN ticket t ON n.idTicket = t.idTicket
            WHERE (t.idTechnicien = ? OR n.idTechnicien = ?)
            AND (n.idExpediteur IS NULL OR n.idExpediteur != ?)
            AND n.dateCreation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY n.dateCreation DESC
            LIMIT 100
        ";
        $params = [$idUtilisateur, $idUtilisateur, $idUtilisateur];
    } else if ($typeUtilisateur === 'directeur') {
        // Pour un directeur : récupérer seulement les notifications importantes
        // - Nouveaux tickets urgents (pas encore assignés)
        // - Assignations de techniciens
        // - Tickets urgents fermés
        // - Messages des tickets assignés aux techniciens
        // - Messages des tickets non assignés (seulement si créés par le directeur)
        $requeteNotifications = "
            SELECT 
                n.idNotification as id,
                n.idTicket,
                n.idExpediteur,
                n.type,
                n.titre,
                n.message,
                n.dateCreation as dateEnvoi,
                n.lu as readStatus,
                n.nomExpediteur as nom,
                n.prenomExpediteur as prenom,
                t.titre as titreTicket,
                t.statut as statutTicket,
                t.priorite as prioriteTicket
            FROM notifications n
            INNER JOIN ticket t ON n.idTicket = t.idTicket
            WHERE n.dateCreation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            AND n.idExpediteur != ?
            AND (
                -- Nouveaux tickets urgents (pas encore assignés)
                (t.idTechnicien IS NULL AND t.priorite = 'Urgent' AND n.type = 'nouveau_ticket_urgent')
                OR
                -- Assignations de techniciens
                (n.type = 'assignation_technicien')
                OR
                -- Tickets urgents fermés
                (t.priorite = 'Urgent' AND n.type = 'ticket_ferme_urgent')
                OR
                -- Messages des tickets assignés aux techniciens
                (t.idTechnicien IS NOT NULL AND n.type = 'nouveau_message')
                OR
                -- Messages des tickets non assignés (seulement si créés par le directeur)
                (t.idTechnicien IS NULL AND n.type = 'nouveau_message' AND t.idUtilisateur = ?)
            )
            ORDER BY n.dateCreation DESC
            LIMIT 100
        ";
        $params = [$idUtilisateur, $idUtilisateur];
    } else {
        // Pour un employé : récupérer ses notifications
        $requeteNotifications = "
            SELECT 
                n.idNotification as id,
                n.idTicket,
                n.idExpediteur,
                n.type,
                n.titre,
                n.message,
                n.dateCreation as dateEnvoi,
                n.lu as readStatus,
                n.nomExpediteur as nom,
                n.prenomExpediteur as prenom,
                t.titre as titreTicket,
                t.statut as statutTicket,
                t.priorite as prioriteTicket
            FROM notifications n
            INNER JOIN ticket t ON n.idTicket = t.idTicket
            WHERE n.idUtilisateur = ?
            AND n.idExpediteur != ?
            AND n.dateCreation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY n.dateCreation DESC
            LIMIT 100
        ";
        $params = [$idUtilisateur, $idUtilisateur];
    }

    error_log('Requête SQL: ' . $requeteNotifications);
    error_log('Paramètres: ' . print_r($params, true));

    $preparation = $bdd->prepare($requeteNotifications);
    $preparation->execute($params);
    $notifications = $preparation->fetchAll(PDO::FETCH_ASSOC);

    error_log('Notifications trouvées: ' . count($notifications));
    error_log('Détails notifications: ' . print_r($notifications, true));

    // Formater les notifications pour le frontend
    $notificationsFormatees = [];
    foreach ($notifications as $notification) {
        $notificationsFormatees[] = [
            'id' => (int)$notification['id'],
            'idTicket' => (int)$notification['idTicket'],
            'idExpediteur' => (int)$notification['idExpediteur'],
            'message' => $notification['message'],
            'dateEnvoi' => $notification['dateEnvoi'],
            'nom' => $notification['nom'] ?: 'Utilisateur',
            'prenom' => $notification['prenom'] ?: '',
            'titreTicket' => $notification['titreTicket'],
            'statutTicket' => $notification['statutTicket'],
            'prioriteTicket' => $notification['prioriteTicket'],
            'read' => (bool)$notification['readStatus'], // Convertir 0/1 en boolean
            'type' => $notification['type'],
            'titre' => $notification['titre']
        ];
    }

    error_log('Notifications formatées: ' . count($notificationsFormatees));

    echo json_encode([
        'succes' => true,
        'notifications' => $notificationsFormatees,
        'debug' => [
            'count' => count($notificationsFormatees),
            'idUtilisateur' => $idUtilisateur,
            'typeUtilisateur' => $typeUtilisateur
        ]
    ]);

} catch (Exception $e) {
    error_log('ERREUR dans getNotifications.php: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    echo json_encode([
        'succes' => false,
        'erreur' => 'Erreur lors de la récupération des notifications',
        'debug' => [
            'message' => 'Une erreur est survenue.',
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}

error_log('=== FIN getNotifications.php ===');
?> 
