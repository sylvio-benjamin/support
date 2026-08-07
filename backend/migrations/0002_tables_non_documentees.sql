-- Migration 0002 — tables créées sans migration dédiée
-- 13 tables trouvées dans database/Support.sql (dump complet du 29/07,
-- MAMP local) mais absentes de toute migration numérotée : elles ont été
-- créées directement en production au fil du développement (plusieurs via
-- les blocs `CREATE TABLE IF NOT EXISTS` dispersés dans le code PHP,
-- cf. backend/modele/listeTicket.php et marquerMessagesLus.php pour
-- messagesLus). Ce fichier n'est PAS une reconstitution de leur historique
-- réel (inconnu) mais une photo fidèle de leur structure au 29/07/2026,
-- pour que le schéma versionné rattrape enfin la réalité.
-- Idempotent (CREATE TABLE IF NOT EXISTS) : peut être rejoué sans risque.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `archiveTicket` (
  `idTicketArchive` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `idUtilisateur` int NOT NULL,
  `idTechnicien` int DEFAULT NULL,
  `titre` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `categorie` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `serviceConcerne` varchar(75) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `priorite` enum('basse','normale','haute','urgente') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'normale',
  `statut` enum('en_attente','en_cours','resolu','ferme') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'en_attente',
  `dateCreation` datetime DEFAULT CURRENT_TIMESTAMP,
  `dateTicketAssigne` datetime DEFAULT NULL,
  `dateTicketCloture` datetime DEFAULT NULL,
  `sousCategorie` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rapport` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `idTicketOriginal` int DEFAULT NULL,
  `pieceJointe` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`idTicketArchive`),
  UNIQUE KEY `idTicketOriginal` (`idTicketOriginal`),
  KEY `idUtilisateur` (`idUtilisateur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- Note : idTicketOriginal est déjà présent ici (colonne ajoutée
-- historiquement par 0004_archive_ticket_id_original.sql) ; ce fichier
-- documente l'état final, cette migration précédente reste idempotente.

CREATE TABLE IF NOT EXISTS `Calendrier` (
  `idCalendrier` int NOT NULL AUTO_INCREMENT,
  `idTechnicien` int NOT NULL,
  `idUtilisateur` int NOT NULL,
  `idTicket` int NOT NULL,
  `Titre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `date` date NOT NULL,
  `heure` time NOT NULL,
  `status` enum('Futur','Présent','Passé','') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `priorite` enum('normal','important','urgent','') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `Acceptation` enum('Accepté','Refusé','Attente','') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Attente',
  PRIMARY KEY (`idCalendrier`),
  UNIQUE KEY `idTicket` (`idTicket`),
  KEY `idUtilisateur` (`idUtilisateur`),
  KEY `idTechnicien` (`idTechnicien`),
  CONSTRAINT `Calendrier_ibfk_1` FOREIGN KEY (`idTechnicien`) REFERENCES `techniciens` (`idTechnicien`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Calendrier_ibfk_2` FOREIGN KEY (`idUtilisateur`) REFERENCES `utilisateur` (`idUtilisateur`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `conversation_fichiers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `idMessage` int NOT NULL,
  `cheminFichier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idMessage` (`idMessage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `directeurs` (
  `idDirecteur` int NOT NULL AUTO_INCREMENT,
  `loginDirecteur` varchar(255) NOT NULL,
  `motDePasse` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'directeur',
  `nomDirecteur` varchar(255) DEFAULT NULL,
  `prenomDirecteur` varchar(255) DEFAULT NULL,
  `emailDirecteur` varchar(255) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `naissance` date DEFAULT NULL,
  `photoprofil` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idDirecteur`),
  UNIQUE KEY `loginDirecteur` (`loginDirecteur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `fichier` (
  `idTicket` int NOT NULL,
  `cheminFichier` varchar(255) NOT NULL,
  KEY `fichier_ibfk_1` (`idTicket`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS `login_attempts_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip` varchar(45) NOT NULL,
  `identifiant` varchar(100) NOT NULL,
  `dateEssai` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip_date` (`ip`,`dateEssai`),
  KEY `idx_identifiant_date` (`identifiant`,`dateEssai`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- État avant correctif : clés uniques cassées par des colonnes nullables
-- (NULL != NULL en SQL), corrigé par la migration 0007. Volontairement non
-- corrigé ici pour rester une photo fidèle de l'état au 29/07.
CREATE TABLE IF NOT EXISTS `messagesLus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `idTicket` int NOT NULL,
  `idUtilisateur` int DEFAULT NULL,
  `idTechnicien` int DEFAULT NULL,
  `typeUtilisateur` enum('utilisateur','technicien','directeur','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dateLecture` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_lecture` (`idTicket`,`idUtilisateur`,`idTechnicien`,`typeUtilisateur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `parametresPlateforme` (
  `id` tinyint NOT NULL DEFAULT '1',
  `notifEmail` tinyint(1) NOT NULL DEFAULT '1',
  `notifTicketNouveau` tinyint(1) NOT NULL DEFAULT '1',
  `notifTicketUrgent` tinyint(1) NOT NULL DEFAULT '1',
  `notifResolution` tinyint(1) NOT NULL DEFAULT '0',
  `autoAssign` tinyint(1) NOT NULL DEFAULT '0',
  `delaiRelanceHeures` int NOT NULL DEFAULT '48',
  `dateModification` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `partagerTicket` (
  `idPartageTicket` int NOT NULL AUTO_INCREMENT,
  `idTicket` int NOT NULL,
  `idTechnicien` int NOT NULL,
  PRIMARY KEY (`idPartageTicket`),
  KEY `partagerTicket_ibfk_1` (`idTechnicien`),
  KEY `idTicket` (`idTicket`),
  CONSTRAINT `partagerTicket_ibfk_1` FOREIGN KEY (`idTechnicien`) REFERENCES `techniciens` (`idTechnicien`) ON UPDATE CASCADE,
  CONSTRAINT `partagerTicket_ibfk_2` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- `services` doit être créée avant `roleTechnicien`, qui la référence par
-- clé étrangère (InnoDB exige que la table référencée existe déjà).
CREATE TABLE IF NOT EXISTS `services` (
  `idService` int NOT NULL AUTO_INCREMENT,
  `nomService` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `heureDebut` time NOT NULL,
  `heureFin` time NOT NULL,
  `jourDebut` enum('lundi','mardi','mercredi','jeudi','vendredi','samedi','Dimanche','7j/7j') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `jourFin` enum('lundi','mardi','mercredi','jeudi','vendredi','samedi','Dimanche','7j/7j') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`idService`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `roleTechnicien` (
  `idRoleTechnicien` int NOT NULL AUTO_INCREMENT,
  `idTechnicien` int NOT NULL,
  `idService` int NOT NULL,
  PRIMARY KEY (`idRoleTechnicien`),
  KEY `idTechnicien` (`idTechnicien`),
  KEY `idService` (`idService`),
  CONSTRAINT `roleTechnicien_ibfk_1` FOREIGN KEY (`idTechnicien`) REFERENCES `techniciens` (`idTechnicien`),
  CONSTRAINT `roleTechnicien_ibfk_2` FOREIGN KEY (`idService`) REFERENCES `services` (`idService`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `ticket_urgent_public_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip` varchar(45) NOT NULL,
  `dateEnvoi` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip_date` (`ip`,`dateEnvoi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_activity_tracker` (
  `idUtilisateur` int NOT NULL,
  `idTicket` int NOT NULL,
  `lastActivity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idUtilisateur`,`idTicket`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Référencée par backend/modele/listeTicket.php (obtenirTicketsUtilisateur :
-- "OR idTicket IN (SELECT idTicket FROM ticketMembres WHERE idUtilisateur = ?)")
-- mais absente du dump du 29/07 — créée après cette date. Structure déduite
-- de son usage dans le code (table de liaison "collègue ajouté à un
-- ticket"), à VÉRIFIER contre la production via `SHOW CREATE TABLE
-- ticketMembres` avant de considérer cette définition comme définitive.
CREATE TABLE IF NOT EXISTS `ticketMembres` (
  `idTicketMembre` int NOT NULL AUTO_INCREMENT,
  `idTicket` int NOT NULL,
  `idUtilisateur` int NOT NULL,
  `dateAjout` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idTicketMembre`),
  UNIQUE KEY `uniq_ticket_membre` (`idTicket`,`idUtilisateur`),
  CONSTRAINT `ticketMembres_ibfk_1` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE CASCADE,
  CONSTRAINT `ticketMembres_ibfk_2` FOREIGN KEY (`idUtilisateur`) REFERENCES `utilisateur` (`idUtilisateur`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;
