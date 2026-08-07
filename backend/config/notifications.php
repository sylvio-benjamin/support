<?php
// Types de notification canoniques et fonction unique de création. Avant ce
// fichier, chaque endpoit (ajouterTicket.php, assignerTicket.php,
// fermerTicket.php, saveChatMessage.php...) réécrivait sa propre requête
// INSERT INTO notifications, avec deux conséquences :
//  - plusieurs événements distincts partageaient le même type ('nouveau_ticket'
//    pour un ticket normal ET un ticket urgent envoyé aux directeurs ;
//    'changement_statut' pour une résolution ET une fermeture urgente), ce qui
//    rendait le frontend incapable de les distinguer de façon fiable ;
//  - la notification de message de chat utilisait un type ('message') qui
//    n'existait pas dans l'ENUM de la colonne, et omettait la colonne titre
//    (NOT NULL sans valeur par défaut) : l'INSERT levait systématiquement une
//    PDOException dès qu'un technicien était assigné et pas actif sur le
//    ticket, annulant (rollback) TOUT le message — donc le message n'était
//    jamais enregistré. Voir migration : la colonne "type" est passée
//    d'ENUM à VARCHAR pour permettre d'ajouter de nouveaux types sans ALTER
//    TABLE à chaque fois.
// À garder synchronisé avec support-it/lib/notificationTypes.ts (mêmes
// valeurs de chaîne).

define('NOTIF_NOUVEAU_TICKET', 'nouveau_ticket');
define('NOTIF_NOUVEAU_TICKET_URGENT', 'nouveau_ticket_urgent');
define('NOTIF_ASSIGNATION', 'assignation_technicien');
define('NOTIF_TICKET_PRIS_EN_CHARGE', 'ticket_pris_en_charge');
define('NOTIF_NOUVEAU_MESSAGE', 'nouveau_message');
define('NOTIF_TICKET_RESOLU', 'ticket_resolu');
define('NOTIF_TICKET_FERME', 'ticket_ferme');
define('NOTIF_TICKET_FERME_URGENT', 'ticket_ferme_urgent');
define('NOTIF_RELANCE_TICKET', 'relance_ticket');
define('NOTIF_RDV_PROPOSE', 'rdv_propose');
define('NOTIF_RDV_REPONSE', 'rdv_reponse');

/**
 * Crée une notification pour UN destinataire : soit un employé (table
 * utilisateur, colonne idUtilisateur), soit un compte interne technicien ou
 * directeur (table techniciens, colonne idTechnicien) — jamais les deux à la
 * fois. Centralise le choix de colonne, qui était auparavant recopié (et,
 * dans saveChatMessage.php, utilisé pour le mauvais destinataire) dans
 * chaque fichier appelant.
 *
 * @param PDO $bdd
 * @param array{
 *   type: string,
 *   idTicket: int,
 *   message: string,
 *   titre?: ?string,
 *   destinataireUtilisateur?: int|null,
 *   destinataireTechnicien?: int|null,
 *   idExpediteur?: int|null,
 *   nomExpediteur?: string|null,
 *   prenomExpediteur?: string|null
 * } $params
 * @return bool
 */
function creerNotification(PDO $bdd, array $params): bool {
    $destUtilisateur = $params['destinataireUtilisateur'] ?? null;
    $destTechnicien = $params['destinataireTechnicien'] ?? null;

    if (!$destUtilisateur && !$destTechnicien) {
        error_log('creerNotification: aucun destinataire fourni (type=' . ($params['type'] ?? '?') . '), notification ignorée.');
        return false;
    }
    if ($destUtilisateur && $destTechnicien) {
        error_log('creerNotification: destinataire ambigu (utilisateur ET technicien fournis), notification ignorée.');
        return false;
    }

    $colonne = $destUtilisateur ? 'idUtilisateur' : 'idTechnicien';
    $idDestinataire = $destUtilisateur ?: $destTechnicien;

    try {
        $stmt = $bdd->prepare("
            INSERT INTO notifications
            ($colonne, idTicket, type, titre, message, idExpediteur, nomExpediteur, prenomExpediteur, dateCreation, lu)
            VALUES
            (:idDestinataire, :idTicket, :type, :titre, :message, :idExpediteur, :nomExpediteur, :prenomExpediteur, NOW(), 0)
        ");
        return $stmt->execute([
            ':idDestinataire' => $idDestinataire,
            ':idTicket' => $params['idTicket'],
            ':type' => $params['type'],
            ':titre' => $params['titre'] ?? null,
            ':message' => $params['message'],
            ':idExpediteur' => $params['idExpediteur'] ?? null,
            ':nomExpediteur' => $params['nomExpediteur'] ?? null,
            ':prenomExpediteur' => $params['prenomExpediteur'] ?? null,
        ]);
    } catch (PDOException $e) {
        error_log('creerNotification: échec insertion (type=' . ($params['type'] ?? '?') . '): ' . $e->getMessage());
        return false;
    }
}
