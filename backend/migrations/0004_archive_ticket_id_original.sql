-- Migration 0004 — idTicketOriginal sur archiveTicket
-- Reprise fidèle de database/addIdTicketOriginal.sql (déjà appliqué en
-- production). Nécessite que `archiveTicket` existe déjà (créée en 0002).
-- Non idempotent (ADD COLUMN échoue si déjà présente) : sur un
-- environnement neuf suivant 0001→0007 dans l'ordre, ne l'exécuter qu'une
-- fois. Sans effet à rejouer contre la production actuelle, qui a déjà
-- cette colonne (voir 0002, où idTicketOriginal figure déjà dans la
-- définition finale d'archiveTicket).

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- La colonne idTicketOriginal est déjà présente dans 0002 (le dump du
-- 29/07 la contenait déjà, cette migration ayant été appliquée avant).
-- Seul le backfill ci-dessous reste utile s'il n'a jamais été rejoué.

-- Format d'ID d'archive : TF2025072869_1753706816 -> idTicketOriginal = 69
UPDATE archiveTicket
SET idTicketOriginal = CAST(SUBSTRING(idTicketArchive, -2) AS UNSIGNED)
WHERE idTicketOriginal IS NULL;

COMMIT;
