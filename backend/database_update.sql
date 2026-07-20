-- Script de mise à jour pour ajouter le système de notifications
-- À exécuter sur votre base de données existante

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Ajouter la colonne fichierJoint à la table conversation existante (si elle n'existe pas déjà)
ALTER TABLE `conversation` 
ADD COLUMN `fichierJoint` varchar(255) DEFAULT NULL;

-- Créer la table notifications
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

-- Ajouter les contraintes pour la table notifications
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`idUtilisateur`) REFERENCES `utilisateur` (`idUtilisateur`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE CASCADE;

COMMIT; 