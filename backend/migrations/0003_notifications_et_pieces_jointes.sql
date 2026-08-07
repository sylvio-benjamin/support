-- Migration 0003 — système de notifications (v1) + pièce jointe conversation
-- Reprise fidèle de database_update.sql (script déjà écrit et déjà appliqué
-- en production à l'époque). Conservée pour la chronologie.
--
-- ATTENTION — DESTRUCTIF : ce fichier fait un DROP TABLE IF EXISTS
-- `notifications` avant de la recréer. C'était sûr au moment où ce script
-- a été écrit (table vide/naissante). Il ne doit JAMAIS être rejoué contre
-- la production actuelle, qui a une table `notifications` avec des données
-- réelles et un schéma déjà plus récent (voir 0006 dans database_update
-- suivants, colonne idTechnicien ajoutée depuis). Utile uniquement pour
-- reconstituer un environnement neuf en suivant 0001→0007 dans l'ordre.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- `conversation.fichierJoint` est déjà présente dans 0001 (le dump baseline
-- la contenait déjà : ce script avait donc été appliqué avant que ce dump
-- soit pris). Rien à faire ici pour cette colonne, uniquement la table
-- notifications.

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `idNotification` int NOT NULL AUTO_INCREMENT,
  `idUtilisateur` int NOT NULL,
  `idTicket` int NOT NULL,
  `type` enum('nouveau_message','assignation_technicien','changement_statut') NOT NULL,
  `titre` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `dateCreation` datetime DEFAULT CURRENT_TIMESTAMP,
  `lu` tinyint(1) DEFAULT 0,
  `idExpediteur` int DEFAULT NULL,
  `nomExpediteur` varchar(200) DEFAULT NULL,
  `prenomExpediteur` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`idNotification`),
  KEY `idUtilisateur` (`idUtilisateur`),
  KEY `idTicket` (`idTicket`),
  KEY `lu` (`lu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`idUtilisateur`) REFERENCES `utilisateur` (`idUtilisateur`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE CASCADE;

COMMIT;
