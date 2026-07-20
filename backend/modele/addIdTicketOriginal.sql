-- Ajouter la colonne idTicketOriginal à la table archiveTicket
ALTER TABLE archiveTicket ADD COLUMN idTicketOriginal INT NULL AFTER rapport;

-- Mettre à jour les archives existantes avec l'ID original extrait de l'ID d'archive
-- Pour les archives existantes, on va extraire l'ID original depuis l'ID d'archive
-- Format: TF2025072869_1753706816 -> on veut récupérer 69
UPDATE archiveTicket 
SET idTicketOriginal = CAST(SUBSTRING(idTicketArchive, -2) AS UNSIGNED)
WHERE idTicketOriginal IS NULL; 