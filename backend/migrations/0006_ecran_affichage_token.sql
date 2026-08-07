-- Migration 0006 — écran d'affichage public par token
-- Reprise fidèle de database/database_update_affichage_token.sql (déjà
-- appliqué en production : le rôle 'affichage' n'existe plus dans les
-- comptes techniciens, confirmé par backend/config/session.php et
-- middleware.ts qui référencent uniquement le token public).

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

ALTER TABLE `parametresPlateforme`
  ADD COLUMN `tokenAffichage` CHAR(64) DEFAULT NULL AFTER `delaiRelanceHeures`,
  ADD UNIQUE KEY `uniq_tokenAffichage` (`tokenAffichage`);

DELETE FROM `techniciens` WHERE `role` = 'affichage';

COMMIT;
