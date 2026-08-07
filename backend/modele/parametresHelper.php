<?php
// Bibliothèque partagée : lecture des préférences plateforme (table
// singleton parametresPlateforme), utilisée par les endpoints qui doivent
// respecter ces réglages avant de créer une notification/email ou
// d'assigner un ticket automatiquement.

function obtenirParametresPlateforme($bdd) {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $defaut = [
        'notifEmail' => 1,
        'notifTicketNouveau' => 1,
        'notifTicketUrgent' => 1,
        'notifResolution' => 0,
        'autoAssign' => 0,
        'delaiRelanceHeures' => 48,
    ];

    try {
        $stmt = $bdd->query("SELECT notifEmail, notifTicketNouveau, notifTicketUrgent, notifResolution, autoAssign, delaiRelanceHeures FROM parametresPlateforme WHERE id = 1");
        $parametres = $stmt->fetch(PDO::FETCH_ASSOC);
        $cache = $parametres ?: $defaut;
    } catch (\Throwable $e) {
        // La table n'existe pas encore ou erreur BDD : on retombe sur des
        // valeurs par défaut sûres plutôt que de faire échouer l'appelant.
        $cache = $defaut;
    }

    return $cache;
}
