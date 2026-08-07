-- Migration 0005 — contraintes manquantes + table de réinitialisation de mot de passe
-- Reprise de database/database_update_security.sql, déjà écrit précédemment
-- mais dont l'application effective en production n'est PAS confirmée —
-- c'est le correctif direct du point "doublon de compte technicien" trouvé
-- et corrigé manuellement cette session (deux comptes distincts pour Nils
-- Fradet, id 12 et 56, jamais bloqué faute de contrainte d'unicité).
--
-- OBLIGATOIRE avant d'exécuter les ADD UNIQUE : vérifier l'absence de
-- doublons avec les requêtes ci-dessous (elles ne doivent RIEN retourner).
-- Si des doublons sont trouvés, les arbitrer/fusionner manuellement d'abord
-- (voir la fusion des comptes 12/56 faite cette session comme modèle) :
--
-- SELECT loginTechnicien, COUNT(*) FROM techniciens GROUP BY loginTechnicien HAVING COUNT(*) > 1;
-- SELECT loginUtilisateur, COUNT(*) FROM utilisateur GROUP BY loginUtilisateur HAVING COUNT(*) > 1;
-- SELECT emailUtilisateur, COUNT(*) FROM utilisateur GROUP BY emailUtilisateur HAVING COUNT(*) > 1;
-- SELECT nomEntreprise, COUNT(*) FROM entreprise GROUP BY nomEntreprise HAVING COUNT(*) > 1;
--
-- Note : ceci protège contre un compte dupliqué avec le MÊME login ; le cas
-- réel rencontré (12/56) avait apparemment deux logins différents pour la
-- même personne, que cette contrainte seule n'aurait pas empêché. Une
-- unicité sur emailTechnicien serait un filet supplémentaire mais est
-- actuellement nullable (NULL != NULL en SQL, plusieurs comptes sans email
-- resteraient possibles) : à durcir plus tard si emailTechnicien devient
-- obligatoire au niveau applicatif.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `reinitialiserMotDePasse` (
  `idToken` varchar(255) NOT NULL,
  `login` varchar(55) NOT NULL,
  `expire` tinyint(1) NOT NULL DEFAULT 0,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idToken`),
  KEY `idx_login_expire` (`login`, `expire`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
