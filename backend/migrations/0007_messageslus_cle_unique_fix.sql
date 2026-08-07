-- Migration 0007 — correctif clé unique messagesLus
-- Appliquée en production cette session. La clé unique d'origine incluait
-- des colonnes nullables (idUtilisateur, idTechnicien) : NULL != NULL en
-- SQL, donc ON DUPLICATE KEY UPDATE ne dédupliquait jamais réellement —
-- plus de 1100 lignes accumulées pour un usage de test minimal, et le
-- badge "messages non lus" restait bloqué (mauvaise ligne choisie par un
-- LIMIT 1 sans ORDER BY parmi les doublons). Voir aussi le correctif
-- correspondant dans backend/modele/listeTicket.php (ORDER BY
-- ml.dateLecture DESC ajouté aux deux sous-requêtes de
-- getMessagesNonLusQuery) et backend/modele/marquerMessagesLus.php.
--
-- Remplace la colonne (idUtilisateur, idTechnicien) par une colonne
-- calculée idPersonne = COALESCE(idUtilisateur, idTechnicien), NON
-- nullable pour les lignes réelles, sur laquelle la clé unique fonctionne
-- enfin correctement.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- 1. Déduplication : ne garde que la lecture la plus récente par
--    (ticket, personne, type).
DELETE ml1 FROM messagesLus ml1
INNER JOIN messagesLus ml2
  ON ml1.idTicket = ml2.idTicket
  AND COALESCE(ml1.idUtilisateur, ml1.idTechnicien) = COALESCE(ml2.idUtilisateur, ml2.idTechnicien)
  AND ml1.typeUtilisateur = ml2.typeUtilisateur
  AND (ml1.dateLecture < ml2.dateLecture
       OR (ml1.dateLecture = ml2.dateLecture AND ml1.id < ml2.id));

-- 2. Supprime l'éventuel doublon d'index (`unique_ticket_user`, identique à
--    `unique_lecture`, présent en production mais pas forcément sur un
--    environnement neuf recréé via 0001→0007) — en SQL dynamique car MySQL
--    n'accepte pas `DROP INDEX IF EXISTS` combiné à d'autres clauses dans
--    la même instruction ALTER TABLE.
SET @idx_existe = (
  SELECT COUNT(1) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'messagesLus' AND index_name = 'unique_ticket_user'
);
SET @sql_drop = IF(@idx_existe > 0, 'ALTER TABLE messagesLus DROP INDEX unique_ticket_user', 'SELECT 1');
PREPARE stmt FROM @sql_drop;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Supprime la clé cassée restante, ajoute la colonne calculée, ajoute la
--    nouvelle clé — dans UNE seule instruction ALTER TABLE : la contrainte
--    de clé étrangère sur idTicket a besoin d'un index la couvrant à tout
--    instant, donc dropper l'ancienne clé et ajouter la nouvelle dans des
--    ALTER séparés échoue (pas d'index disponible entre les deux).
ALTER TABLE messagesLus
  DROP INDEX unique_lecture,
  ADD COLUMN idPersonne INT GENERATED ALWAYS AS (COALESCE(idUtilisateur, idTechnicien)) STORED AFTER idTechnicien,
  ADD UNIQUE KEY unique_lecture (idTicket, idPersonne, typeUtilisateur);

COMMIT;
