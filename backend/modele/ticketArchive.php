<?php
// Bibliothèque de fonctions d'archivage des tickets, chargée via require_once
// par fermerTicket.php (qui a déjà son propre bootstrap CORS/session/BDD).
// Pas de code exécutable au chargement : ce fichier n'est jamais appelé
// directement comme endpoint HTTP.

function creationTicketId($ticket) {
    $prefixe = ($ticket['statut'] === 'ferme') ? 'TF' : 'TR';
    $dateCloture = date('Ymd', strtotime($ticket['dateTicketCloture']));
    $timestamp = time(); // Ajoute un timestamp pour rendre l'ID unique
    return $prefixe . $dateCloture . $ticket['idTicket'] . '_' . $timestamp;
}

function migrerTicketsResoluOuFerme($bdd) {
    try {
        // Étape 1 : Récupérer les tickets à archiver
        $requete = $bdd->prepare("SELECT * FROM ticket WHERE statut IN ('ferme', 'resolu')");
        $requete->execute();
        $tickets = $requete->fetchAll(PDO::FETCH_ASSOC);

        if (empty($tickets)) {
            return ['success' => true, 'message' => 'Aucun ticket à archiver.'];
        }

        // Étape 2 : Insérer ticket par ticket avec un ID personnalisé
                    $insert = $bdd->prepare("
                INSERT INTO archiveTicket (
                    idTicketArchive, idUtilisateur, idTechnicien, titre, description, categorie,
                    serviceConcerne, priorite, statut, dateCreation,
                    dateTicketAssigne, dateTicketCloture, sousCategorie, rapport, idTicketOriginal, pieceJointe
                ) VALUES (
                    :idTicketArchive, :idUtilisateur, :idTechnicien, :titre, :description, :categorie,
                    :serviceConcerne, :priorite, :statut, :dateCreation,
                    :dateTicketAssigne, :dateTicketCloture, :sousCategorie, :rapport, :idTicketOriginal, :pieceJointe
                )
            ");

        foreach ($tickets as $ticket) {
            $idTicketCustom = creationTicketId($ticket);

            $insert->execute([
                ':idTicketArchive' => $idTicketCustom,
                ':idUtilisateur' => $ticket['idUtilisateur'],
                ':idTechnicien' => $ticket['idTechnicien'],
                ':titre' => $ticket['titre'],
                ':description' => $ticket['description'],
                ':categorie' => $ticket['categorie'],
                ':serviceConcerne' => $ticket['serviceConcerne'],
                ':priorite' => $ticket['priorite'],
                ':statut' => $ticket['statut'],
                ':dateCreation' => $ticket['dateCreation'],
                ':dateTicketAssigne' => $ticket['dateTicketAssigne'] ?? null,
                ':dateTicketCloture' => $ticket['dateTicketCloture'],
                ':sousCategorie' => $ticket['sousCategorie'],
                ':rapport' => $ticket['rapport'] ?? null,
                ':idTicketOriginal' => $ticket['idTicket'],
                ':pieceJointe' => $ticket['pieceJointe'] ?? null
            ]);
        }

        // Étape 3 : Supprimer les tickets migrés
        $bdd->prepare("DELETE FROM ticket WHERE statut IN ('ferme', 'resolu')")->execute();

        return ['success' => true, 'message' => count($tickets) . ' tickets archivés avec succès.'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Erreur BDD.'];
    }
}

?>