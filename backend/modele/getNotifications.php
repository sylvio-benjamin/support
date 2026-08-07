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
    
    // idUtilisateur/typeUtilisateur sont dérivés de la SESSION, jamais du corps
    // envoyé par le client (sinon n'importe quel compte authentifié peut lire
    // les notifications de n'importe qui d'autre en fournissant son id — IDOR
    // confirmé par cybersecurity/rapports/idor_notifications.md). Le mapping
    // ci-dessous reproduit exactement les valeurs que le frontend envoyait déjà
    // pour chaque rôle (voir components/hooks/use*Notifications.ts et
    // app/*/notifications/page.tsx), donc la portée visible par rôle est
    // inchangée — seule la possibilité de l'usurper disparaît.
    // estDirecteurPlateforme() (config/session.php) distingue un directeur
    // INTERNE (plateforme) d'un directeur "client" (une seule entreprise) :
    // role==='directeur' seul les confond, ce qui donnait à un directeur
    // client la vue GLOBALE non filtrée (branche 'directeur' ci-dessous) sur
    // les notifications de toutes les entreprises.
    $sessionUser = $_SESSION['user'];
    if (estDirecteurPlateforme()) {
        // Vue globale (voir la branche 'directeur' ci-dessous, non filtrée) :
        // l'id exact n'a pas d'incidence sur le résultat.
        $idUtilisateur = $sessionUser['idDirecteur'] ?? $sessionUser['idTechnicien'] ?? $sessionUser['idUtilisateur'] ?? 0;
        $typeUtilisateur = 'directeur';
    } elseif (isset($sessionUser['idTechnicien'])) {
        $idUtilisateur = $sessionUser['idTechnicien'];
        $typeUtilisateur = 'technicien';
    } else {
        $idUtilisateur = $sessionUser['idUtilisateur'] ?? 0;
        $typeUtilisateur = 'utilisateur';
    }

    error_log("ID Utilisateur demandé: $idUtilisateur, Type: $typeUtilisateur");

    if (!$idUtilisateur || $idUtilisateur <= 0) {
        echo json_encode([
            'succes' => false,
            'erreur' => 'ID utilisateur manquant ou invalide',
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
            LEFT JOIN ticket t ON n.idTicket = t.idTicket
            WHERE (t.idTechnicien = ? OR n.idTechnicien = ?)
            AND (n.idExpediteur IS NULL OR n.idExpediteur != ?)
            AND n.dateCreation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY n.dateCreation DESC
            LIMIT 100
        ";
        $params = [$idUtilisateur, $idUtilisateur, $idUtilisateur];
    } else if ($typeUtilisateur === 'directeur') {
        // Le directeur a une vue globale sur toute la plateforme (comme pour
        // la liste des tickets, obtenirTousLesTickets) : il reçoit TOUTES les
        // notifications, pas seulement celles qui lui sont adressées
        // directement (idTechnicien) ni un sous-ensemble de types.
        //
        // Anciennement filtré à un sous-ensemble de types jugés "importants" ;
        // ce filtrage excluait de fait les tickets/fermetures non urgents, et
        // deux de ses branches (`t.priorite = 'Urgent'`) ne correspondaient
        // même plus au schéma réel (`priorite` vaut 'urgente' en minuscules).
        //
        // Pas de filtre "idExpediteur != moi" ici : contrairement aux
        // branches technicien/utilisateur (où ce filtre exclut à raison mes
        // propres notifications, puisque destinataire == moi), la vue
        // directeur n'est PAS scopée par destinataire — le directeur est
        // "l'expéditeur" de toute notification générée par un ticket qu'il a
        // lui-même créé (ex: depuis "Créer un ticket" pour un employé), même
        // si le VRAI destinataire est un technicien. Avec ce filtre, dès
        // qu'un directeur créait un ticket lui-même, toutes les notifications
        // qui en découlaient disparaissaient de SA PROPRE vue globale — plus
        // aucune notification visible.
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
            LEFT JOIN ticket t ON n.idTicket = t.idTicket
            WHERE n.dateCreation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY n.dateCreation DESC
            LIMIT 100
        ";
        $params = [];
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
            LEFT JOIN ticket t ON n.idTicket = t.idTicket
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
    ]);

} catch (Exception $e) {
    error_log('ERREUR dans getNotifications.php: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());

    http_response_code(500);
    echo json_encode([
        'succes' => false,
        'erreur' => 'Erreur lors de la récupération des notifications',
    ]);
}

error_log('=== FIN getNotifications.php ===');
?> 
