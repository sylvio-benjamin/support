-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : mar. 24 juin 2025 à 07:16
-- Version du serveur : 9.1.0
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `stage_bdd`
--

-- --------------------------------------------------------

--
-- Structure de la table `categorie`
--

DROP TABLE IF EXISTS `categorie`;
CREATE TABLE IF NOT EXISTS `categorie` (
  `nomCategorie` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`nomCategorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `categorie`
--

INSERT INTO `categorie` (`nomCategorie`) VALUES
('Autre'),
('Comptes et accès'),
('Impression et périphériques'),
('Logiciel'),
('Matériel(Hardware)'),
('Messagerie et communication'),
('Réseau et Internet'),
('Sécurité informatique'),
('Stockage fichiers');

-- --------------------------------------------------------

--
-- Structure de la table `entreprise`
--

DROP TABLE IF EXISTS `entreprise`;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `entreprise`
--

INSERT INTO `entreprise` (`idEntreprise`, `nomEntreprise`, `acronymeEntreprise`, `categorie`, `pays`, `ville`, `adresse`, `adresseEntreprise`) VALUES
(1, 'Exemple SARL', 'DECS', 'Informatique', 'France', 'Paris', '123 rue Exemple', NULL),
(2, 'Innovatech', 'INVT', 'Technologie', 'France', 'Lyon', '456 Avenue de l\'Innovation', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `souscategorie`
--

DROP TABLE IF EXISTS `souscategorie`;
CREATE TABLE IF NOT EXISTS `souscategorie` (
  `nomSousCategorie` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `nomCategorie` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`nomSousCategorie`),
  KEY `nomCategorie` (`nomCategorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `souscategorie`
--

INSERT INTO `souscategorie` (`nomSousCategorie`, `nomCategorie`) VALUES
('Assistance lors d\'une manipulation', 'Autre'),
('Demande de matériel ou de logiciel', 'Autre'),
('Problème non catégorisable', 'Autre'),
('Question technique', 'Autre'),
('Accès refusé à un service', 'Comptes et accès'),
('Authentification multifactorielle (MFA) / OTP', 'Comptes et accès'),
('Création d'un nouveau compte', 'Comptes et accès'),
('Mot de passe oublié / réinitialisation', 'Comptes et accès'),
('Problèmes de connexion à la messagerie / logiciels métier', 'Comptes et accès'),
('Configuration imprimante / partage réseau', 'Impression et périphériques'),
('Impossible d'imprimer / erreur d'impression', 'Impression et périphériques'),
('Queue d'impression bloquée', 'Impression et périphériques'),
('Scanner non reconnu', 'Impression et périphériques'),
('Application ne se lance pas', 'Logiciel'),
('Bug ou message d'erreur logiciel', 'Logiciel'),
('Conflit entre applications', 'Logiciel'),
('Installation / mise à jour d'un logiciel', 'Logiciel'),
('Problème avec un logiciel spécifique (Word, Excel, etc.)', 'Logiciel'),
('Clavier / souris ne fonctionne pas', 'Matériel(Hardware)'),
('Écran défectueux', 'Matériel(Hardware)'),
('Imprimante / scanner en panne', 'Matériel(Hardware)'),
('Périphérique non reconnu', 'Matériel(Hardware)'),
('Problème avec un PC / Ordinateur portable', 'Matériel(Hardware)'),
('Calendrier partagé / invitations ne fonctionnent pas', 'Messagerie et communication'),
('Notification non reçue', 'Messagerie et communication'),
('Problème avec Teams / Zoom / Skype', 'Messagerie et communication'),
('Problèmes d'envoi / réception d'e-mails', 'Messagerie et communication'),
('Accès au Wi-Fi impossible', 'Réseau et Internet'),
('Connexion Internet lente ou absente', 'Réseau et Internet'),
('DNS / IP non résolus', 'Réseau et Internet'),
('Perte d'accès à un serveur ou à un site interne', 'Réseau et Internet'),
('Problème de VPN', 'Réseau et Internet'),
('Antivirus / pare-feu désactivé ou non fonctionnel', 'Sécurité informatique'),
('E-mail de phishing reçu', 'Sécurité informatique'),
('Intrusion ou activité suspecte', 'Sécurité informatique'),
('Problème de droit d'accès / fichier confidentiel', 'Sécurité informatique'),
('Suspicion de virus ou de malware', 'Sécurité informatique'),
('Accès réseau à un dossier partagé', 'Stockage fichiers'),
('Fichier supprimé / perdu', 'Stockage fichiers'),
('Manque d'espace disque', 'Stockage fichiers'),
('Sauvegarde ne fonctionne pas', 'Stockage fichiers');

-- --------------------------------------------------------

--
-- Structure de la table `techniciens`
--

DROP TABLE IF EXISTS `techniciens`;
CREATE TABLE IF NOT EXISTS `techniciens` (
  `idTechnicien` int NOT NULL AUTO_INCREMENT,
  `loginTechnicien` varchar(55) NOT NULL,
  `nomTechnicien` varchar(100) NOT NULL,
  `prenomTechnicien` varchar(100) NOT NULL,
  `role` enum('referent','technicien','directeur') NOT NULL,
  `motDePasse` varchar(255) NOT NULL,
  `emailTechnicien` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idTechnicien`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `techniciens`
--

INSERT INTO `techniciens` (`idTechnicien`, `loginTechnicien`, `nomTechnicien`, `prenomTechnicien`, `role`, `motDePasse`, `emailTechnicien`) VALUES
(4, 'testStage', 'GUL', 'CANER', 'technicien', '$2y$10$cK8SN/KFmrC/OBycHRauN.xxpXBDsyU4ZlIUKnQzQPRQWnRWxX8J6', 'pro@gmail.com'),
(5, 'tech2', 'sylvio', 'benjamin', 'technicien', '$2y$10$.TbVf383gvyS4a9afg1tlOnagoOw1bdtJsnK/mkCPrGUYOETLod42', 'benj@gmail.com');

-- --------------------------------------------------------

--
-- Structure de la table `ticket`
--

DROP TABLE IF EXISTS `ticket`;
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `ticket`
--

INSERT INTO `ticket` (`idTicket`, `idUtilisateur`, `idTechnicien`, `titre`, `description`, `categorie`, `serviceConcerne`, `priorite`, `idEmploye`, `statut`, `dateCreation`, `sousCategorie`) VALUES
(3, 3, 4, 'fzfz', 'fzgz', 'Logiciel', 'Réseau', 'normale', NULL, 'en_cours', '2025-06-20 14:12:58', NULL),
(5, 3, 5, 'testticket', 'vz z zg', 'Accès', 'Systèmes', 'normale', NULL, 'en_cours', '2025-06-20 14:43:55', NULL),
(6, 3, 5, 'gzgze', 'zgrgzgzg', 'Logiciel', 'Systèmes', 'normale', NULL, 'en_cours', '2025-06-20 15:27:12', NULL),
(7, 3, 5, 'fzfze', 'gfezvezfz', 'Réseau', 'Systèmes', 'normale', NULL, 'en_cours', '2025-06-20 23:16:39', NULL),
(8, 3, 5, 'testSemaine', 'fafzafa', 'Réseau', 'Réseau', 'normale', NULL, 'en_cours', '2025-06-23 09:03:24', NULL),
(10, 3, 5, 'f,nzifz, ', 'fzeefz', 'Matériel', 'Réseau', 'normale', NULL, 'en_cours', '2025-06-23 09:05:45', NULL),
(12, 3, 5, 'testNotif', 'fzefze', 'Matériel', 'Systèmes', 'normale', NULL, 'en_cours', '2025-06-23 10:20:18', NULL),
(13, 3, 5, 'testDate', 'zfzfzfzfzf', 'Réseau', 'Support', 'normale', NULL, 'en_cours', '2025-06-23 10:37:57', NULL),
(14, 3, 4, 'testPage', 'dada', 'Réseau', 'Systèmes', 'normale', NULL, 'en_cours', '2025-06-23 13:09:51', NULL),
(15, 3, 4, 'dada', 'dadad', 'Réseau', 'Réseau', 'normale', NULL, 'en_cours', '2025-06-23 13:10:01', NULL),
(16, 4, 5, 'testticketPerso', 'ffezfez', 'Logiciel', 'Systèmes', 'normale', NULL, 'en_cours', '2025-06-23 13:19:57', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `utilisateur`
--

DROP TABLE IF EXISTS `utilisateur`;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `utilisateur`
--

INSERT INTO `utilisateur` (`idUtilisateur`, `nomUtilisateur`, `prenomUtilisateur`, `emailUtilisateur`, `motDePasseUtilisateur`, `idEntreprise`, `roleEntreprise`, `loginUtilisateur`) VALUES
(3, 'FERI', 'désiré', 'desire@gmail.com', '$2y$10$sdXTInx1ppP/y6htcTg4dOwI6p4ll4/H1N6oF1qD0Dtv2WDD78d.y', 2, 'employe', 'StageLog'),
(4, 'estreich', 'ethan', 'ethstr@gmail.com', '$2y$10$ZqLFfgSLdwP./8yAp2OGl.CVZqQx5Uv/6i92E3sq.VqLzzZ5GNwFe', 1, 'employe', 'CestOk');

-- --------------------------------------------------------

--
-- Structure de la table `conversation`
--

DROP TABLE IF EXISTS `conversation`;
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

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

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

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `souscategorie`
--
ALTER TABLE `souscategorie`
  ADD CONSTRAINT `souscategorie_ibfk_1` FOREIGN KEY (`nomCategorie`) REFERENCES `categorie` (`nomCategorie`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `ticket`
--
ALTER TABLE `ticket`
  ADD CONSTRAINT `fk_ticket_technicien` FOREIGN KEY (`idTechnicien`) REFERENCES `techniciens` (`idTechnicien`) ON DELETE SET NULL,
  ADD CONSTRAINT `ticket_ibfk_1` FOREIGN KEY (`idEmploye`) REFERENCES `techniciens` (`idTechnicien`),
  ADD CONSTRAINT `ticket_ibfk_2` FOREIGN KEY (`idUtilisateur`) REFERENCES `utilisateur` (`idUtilisateur`);

--
-- Contraintes pour la table `utilisateur`
--
ALTER TABLE `utilisateur`
  ADD CONSTRAINT `utilisateur_ibfk_1` FOREIGN KEY (`idEntreprise`) REFERENCES `entreprise` (`idEntreprise`);

--
-- Contraintes pour la table `conversation`
--
ALTER TABLE `conversation`
  ADD CONSTRAINT `conversation_ibfk_1` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversation_ibfk_2` FOREIGN KEY (`idExpediteur`) REFERENCES `utilisateur` (`idUtilisateur`) ON DELETE CASCADE;

--
-- Contraintes pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`idUtilisateur`) REFERENCES `utilisateur` (`idUtilisateur`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
