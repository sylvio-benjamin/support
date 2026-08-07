<?php
// Extraite de listeTicket.php (seule fonction "pure" — pas d'accès session/BDD
// direct, juste une construction de requête SQL) pour la rendre testable en
// PHPUnit sans dépendre de la session HTTP ni d'une connexion BDD. Aucun
// changement de comportement : listeTicket.php la require désormais au lieu
// de la définir en place.

function getMessagesNonLusQuery($idUtilisateur, $typeUtilisateur) {
    // Si aucun ID utilisateur, retourner le comptage simple de tous les messages
    if (!$idUtilisateur) {
        return "(SELECT COUNT(*) FROM conversation c WHERE c.idTicket = t.idTicket) as nombreMessages";
    }

    // Les comptes admin/referent sont des lignes `utilisateur` (idUtilisateur en
    // session, pas idTechnicien) : ils partagent la même colonne que les
    // employés, avec leur propre valeur de typeUtilisateur pour un filigrane
    // de lecture distinct.
    if ($typeUtilisateur === 'utilisateur' || $typeUtilisateur === 'admin' || $typeUtilisateur === 'referent') {
        return "(SELECT COUNT(*) FROM conversation c
                WHERE c.idTicket = t.idTicket
                AND (
                    NOT EXISTS (
                        SELECT 1 FROM messagesLus ml
                        WHERE ml.idTicket = t.idTicket
                        AND ml.idUtilisateur = $idUtilisateur
                        AND ml.typeUtilisateur = '$typeUtilisateur'
                    )
                    OR c.dateEnvoi > (
                        SELECT ml.dateLecture
                        FROM messagesLus ml
                        WHERE ml.idTicket = t.idTicket
                        AND ml.idUtilisateur = $idUtilisateur
                        AND ml.typeUtilisateur = '$typeUtilisateur'
                        ORDER BY ml.dateLecture DESC
                        LIMIT 1
                    )
                )) as nombreMessages";
    } else {
        // Pour techniciens, directeurs, admins
        return "(SELECT COUNT(*) FROM conversation c
                WHERE c.idTicket = t.idTicket
                AND (
                    NOT EXISTS (
                        SELECT 1 FROM messagesLus ml
                        WHERE ml.idTicket = t.idTicket
                        AND ml.idTechnicien = $idUtilisateur
                        AND ml.typeUtilisateur = '$typeUtilisateur'
                    )
                    OR c.dateEnvoi > (
                        SELECT ml.dateLecture
                        FROM messagesLus ml
                        WHERE ml.idTicket = t.idTicket
                        AND ml.idTechnicien = $idUtilisateur
                        AND ml.typeUtilisateur = '$typeUtilisateur'
                        ORDER BY ml.dateLecture DESC
                        LIMIT 1
                    )
                )) as nombreMessages";
    }
}
