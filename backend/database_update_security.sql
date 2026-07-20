-- Migration de sécurité : contraintes manquantes + table de réinitialisation
-- de mot de passe (utilisée en code mais absente du schéma versionné).
-- À exécuter manuellement sur la base de production après vérification
-- qu'aucun doublon n'existe déjà sur les colonnes concernées (voir requêtes
-- de contrôle ci-dessous, à lancer AVANT d'appliquer les ADD UNIQUE).

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Table utilisée par reinitialiserMotDePasse.php / demanderReinitialisationMotDePasse.php.
-- Elle existait déjà en production (hors schéma versionné) ; on la crée ici
-- pour les nouveaux environnements et on documente sa structure réelle.
CREATE TABLE IF NOT EXISTS `reinitialiserMotDePasse` (
  `idToken` varchar(255) NOT NULL,
  `login` varchar(55) NOT NULL,
  `expire` tinyint(1) NOT NULL DEFAULT 0,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idToken`),
  KEY `idx_login_expire` (`login`, `expire`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------------
-- Avant d'exécuter les ADD UNIQUE ci-dessous, vérifier l'absence de
-- doublons avec les requêtes suivantes (elles ne doivent rien retourner) :
--
-- SELECT loginTechnicien, COUNT(*) FROM techniciens GROUP BY loginTechnicien HAVING COUNT(*) > 1;
-- SELECT loginUtilisateur, COUNT(*) FROM utilisateur GROUP BY loginUtilisateur HAVING COUNT(*) > 1;
-- SELECT emailUtilisateur, COUNT(*) FROM utilisateur GROUP BY emailUtilisateur HAVING COUNT(*) > 1;
-- SELECT nomEntreprise, COUNT(*) FROM entreprise GROUP BY nomEntreprise HAVING COUNT(*) > 1;
-- ------------------------------------------------------------------

ALTER TABLE `techniciens`
  ADD UNIQUE KEY `uniq_loginTechnicien` (`loginTechnicien`);

ALTER TABLE `utilisateur`
  ADD UNIQUE KEY `uniq_loginUtilisateur` (`loginUtilisateur`),
  ADD UNIQUE KEY `uniq_emailUtilisateur` (`emailUtilisateur`);

ALTER TABLE `entreprise`
  ADD UNIQUE KEY `uniq_nomEntreprise` (`nomEntreprise`);

-- Index manquant sur la colonne la plus utilisée dans les tris de tickets
-- (ORDER BY dateCreation DESC dans listeTicket.php).
ALTER TABLE `ticket`
  ADD INDEX `idx_dateCreation` (`dateCreation`);

COMMIT;
