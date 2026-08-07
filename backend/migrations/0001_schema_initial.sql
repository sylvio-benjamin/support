-- Migration 0001 — schéma initial
-- Reconstitué fidèlement depuis database/database.sql (dump phpMyAdmin le
-- plus ancien retrouvé ; contenu identique à `git show HEAD:backend/database.sql`,
-- seul endroit où ce fichier existait encore avant sa suppression du dépôt).
-- 8 tables fondatrices. Les `DROP TABLE IF EXISTS` du dump d'origine (prévu
-- pour une restauration complète) ont été retirés : ce fichier est conçu
-- pour être rejoué sur une base EXISTANTE sans rien détruire.
-- Seules les données de référence (catégories/sous-catégories, toujours
-- utilisées par l'application) sont reprises ; les lignes de test
-- (techniciens/utilisateurs/tickets/entreprises fictifs du dump d'origine)
-- ont été volontairement omises.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `categorie` (
  `nomCategorie` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`nomCategorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO `categorie` (`nomCategorie`) VALUES
('Autre'),('Comptes et accès'),('Impression et périphériques'),('Logiciel'),
('Matériel(Hardware)'),('Messagerie et communication'),('Réseau et Internet'),
('Sécurité informatique'),('Stockage fichiers');

CREATE TABLE IF NOT EXISTS `entreprise` (
  `idEntreprise` int NOT NULL AUTO_INCREMENT,
  `nomEntreprise` varchar(75) NOT NULL,
  `acronymeEntreprise` varchar(10) DEFAULT NULL,
  `categorie` varchar(50) DEFAULT NULL,
  `pays` varchar(50) DEFAULT NULL,
  `ville` varchar(50) DEFAULT NULL,
  `adresse` varchar(100) DEFAULT NULL,
  `adresseEntreprise` text,
  PRIMARY KEY (`idEntreprise`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `souscategorie` (
  `nomSousCategorie` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `nomCategorie` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`nomSousCategorie`),
  KEY `nomCategorie` (`nomCategorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO `souscategorie` (`nomSousCategorie`, `nomCategorie`) VALUES
('Assistance lors d\'une manipulation', 'Autre'),
('Demande de matériel ou de logiciel', 'Autre'),
('Problème non catégorisable', 'Autre'),
('Question technique', 'Autre'),
('Accès refusé à un service', 'Comptes et accès'),
('Authentification multifactorielle (MFA) / OTP', 'Comptes et accès'),
('Création d\'un nouveau compte', 'Comptes et accès'),
('Mot de passe oublié / réinitialisation', 'Comptes et accès'),
('Problèmes de connexion à la messagerie / logiciels métier', 'Comptes et accès'),
('Configuration imprimante / partage réseau', 'Impression et périphériques'),
('Impossible d\'imprimer / erreur d\'impression', 'Impression et périphériques'),
('Queue d\'impression bloquée', 'Impression et périphériques'),
('Scanner non reconnu', 'Impression et périphériques'),
('Application ne se lance pas', 'Logiciel'),
('Bug ou message d\'erreur logiciel', 'Logiciel'),
('Conflit entre applications', 'Logiciel'),
('Installation / mise à jour d\'un logiciel', 'Logiciel'),
('Problème avec un logiciel spécifique (Word, Excel, etc.)', 'Logiciel'),
('Clavier / souris ne fonctionne pas', 'Matériel(Hardware)'),
('Écran défectueux', 'Matériel(Hardware)'),
('Imprimante / scanner en panne', 'Matériel(Hardware)'),
('Périphérique non reconnu', 'Matériel(Hardware)'),
('Problème avec un PC / Ordinateur portable', 'Matériel(Hardware)'),
('Calendrier partagé / invitations ne fonctionnent pas', 'Messagerie et communication'),
('Notification non reçue', 'Messagerie et communication'),
('Problème avec Teams / Zoom / Skype', 'Messagerie et communication'),
('Problèmes d\'envoi / réception d\'e-mails', 'Messagerie et communication'),
('Accès au Wi-Fi impossible', 'Réseau et Internet'),
('Connexion Internet lente ou absente', 'Réseau et Internet'),
('DNS / IP non résolus', 'Réseau et Internet'),
('Perte d\'accès à un serveur ou à un site interne', 'Réseau et Internet'),
('Problème de VPN', 'Réseau et Internet'),
('Antivirus / pare-feu désactivé ou non fonctionnel', 'Sécurité informatique'),
('E-mail de phishing reçu', 'Sécurité informatique'),
('Intrusion ou activité suspecte', 'Sécurité informatique'),
('Problème de droit d\'accès / fichier confidentiel', 'Sécurité informatique'),
('Suspicion de virus ou de malware', 'Sécurité informatique'),
('Accès réseau à un dossier partagé', 'Stockage fichiers'),
('Fichier supprimé / perdu', 'Stockage fichiers'),
('Manque d\'espace disque', 'Stockage fichiers'),
('Sauvegarde ne fonctionne pas', 'Stockage fichiers');

CREATE TABLE IF NOT EXISTS `techniciens` (
  `idTechnicien` int NOT NULL AUTO_INCREMENT,
  `loginTechnicien` varchar(55) NOT NULL,
  `nomTechnicien` varchar(100) NOT NULL,
  `prenomTechnicien` varchar(100) NOT NULL,
  `role` enum('referent','technicien','directeur') NOT NULL,
  `motDePasse` varchar(255) NOT NULL,
  `emailTechnicien` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idTechnicien`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `ticket` (
  `idTicket` int NOT NULL AUTO_INCREMENT,
  `idUtilisateur` int NOT NULL,
  `idTechnicien` int DEFAULT NULL,
  `titre` varchar(50) NOT NULL,
  `description` longtext NOT NULL,
  `categorie` varchar(100) DEFAULT NULL,
  `serviceConcerne` varchar(75) NOT NULL,
  `priorite` enum('basse','normale','haute','urgente') DEFAULT 'normale',
  `idEmploye` int DEFAULT NULL,
  `statut` enum('en_attente','en_cours','resolu','ferme') DEFAULT 'en_attente',
  `dateCreation` datetime DEFAULT CURRENT_TIMESTAMP,
  `sousCategorie` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`idTicket`),
  KEY `idEmploye` (`idEmploye`),
  KEY `idUtilisateur` (`idUtilisateur`),
  KEY `fk_ticket_technicien` (`idTechnicien`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `utilisateur` (
  `idUtilisateur` int NOT NULL AUTO_INCREMENT,
  `nomUtilisateur` varchar(100) NOT NULL,
  `prenomUtilisateur` varchar(100) NOT NULL,
  `emailUtilisateur` varchar(255) NOT NULL,
  `motDePasseUtilisateur` varchar(255) NOT NULL,
  `idEntreprise` int NOT NULL,
  `roleEntreprise` varchar(35) NOT NULL,
  `loginUtilisateur` varchar(100) NOT NULL,
  PRIMARY KEY (`idUtilisateur`),
  KEY `idEntreprise` (`idEntreprise`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `conversation` (
  `idConversation` int NOT NULL AUTO_INCREMENT,
  `idTicket` int NOT NULL,
  `idExpediteur` int NOT NULL,
  `message` text NOT NULL,
  `dateEnvoi` datetime DEFAULT CURRENT_TIMESTAMP,
  `fichierJoint` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idConversation`),
  KEY `idTicket` (`idTicket`),
  KEY `idExpediteur` (`idExpediteur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Forme d'origine (2025), remplacée intégralement par la migration 0003
-- (nouveau schéma avec idTechnicien, types étendus). Conservée ici par
-- fidélité historique — sans effet si la table existe déjà.
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

COMMIT;
