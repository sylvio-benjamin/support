<?php
// Tâche de relance automatique des tickets sans réponse — pensée pour être
// exécutée en CLI par une tâche planifiée (cron), pas comme un endpoint web.
// Bloque toute exécution via HTTP pour éviter qu'un simple GET public ne
// déclenche l'envoi massif de notifications.
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Ce script ne peut être exécuté qu\'en ligne de commande (cron).']);
    exit;
}

require_once __DIR__ . '/../connexionBDD.php';
require_once __DIR__ . '/parametresHelper.php';
require_once __DIR__ . '/../config/notifications.php';

$parametres = obtenirParametresPlateforme($bdd);
$delaiHeures = (int)($parametres['delaiRelanceHeures'] ?? 48);
if ($delaiHeures < 1) {
    $delaiHeures = 48;
}

try {
    $stmt = $bdd->prepare("
        SELECT t.*, tech.nomTechnicien, tech.prenomTechnicien
        FROM ticket t
        LEFT JOIN techniciens tech ON t.idTechnicien = tech.idTechnicien
        WHERE t.statut IN ('en_attente', 'en_cours')
        AND t.dateCreation <= DATE_SUB(NOW(), INTERVAL :delai HOUR)
        AND (t.derniereRelance IS NULL OR t.derniereRelance <= DATE_SUB(NOW(), INTERVAL :delai HOUR))
    ");
    $stmt->bindValue(':delai', $delaiHeures, PDO::PARAM_INT);
    $stmt->execute();
    $ticketsARelancer = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    fwrite(STDERR, "Erreur lors de la recherche des tickets à relancer : " . $e->getMessage() . "\n");
    exit(1);
}

$stmtTousTechniciens = $bdd->prepare("SELECT idTechnicien FROM techniciens WHERE role = 'technicien'");
$stmtTousTechniciens->execute();
$tousLesTechniciens = $stmtTousTechniciens->fetchAll(PDO::FETCH_COLUMN);

$stmtMarquer = $bdd->prepare("UPDATE ticket SET derniereRelance = NOW() WHERE idTicket = :idTicket");

$nbRelances = 0;
foreach ($ticketsARelancer as $ticket) {
    $destinataires = $ticket['idTechnicien'] ? [$ticket['idTechnicien']] : $tousLesTechniciens;

    $titreNotif = 'Relance : ticket sans réponse depuis ' . $delaiHeures . 'h';
    $messageNotif = 'Le ticket "' . $ticket['titre'] . '" (#' . $ticket['idTicket'] . ') est resté sans réponse depuis plus de ' . $delaiHeures . ' heures.';

    foreach ($destinataires as $idTechnicien) {
        creerNotification($bdd, [
            'type' => NOTIF_RELANCE_TICKET,
            'idTicket' => $ticket['idTicket'],
            'destinataireTechnicien' => $idTechnicien,
            'titre' => $titreNotif,
            'message' => $messageNotif,
        ]);
    }

    $stmtMarquer->execute([':idTicket' => $ticket['idTicket']]);
    $nbRelances++;
}

echo "Relance terminée : $nbRelances ticket(s) relancé(s) (délai configuré : {$delaiHeures}h).\n";
