// Types de notification canoniques — à garder synchronisés avec
// backend/config/notifications.php (mêmes valeurs de chaîne). Avant ce
// fichier, chaque écran comparait des chaînes en dur, souvent différentes de
// ce que le backend envoyait réellement (ex: le frontend attendait
// 'nouveau_ticket_urgent' alors que le backend n'a jamais écrit que
// 'nouveau_ticket', urgent ou non).

export const NOTIF_NOUVEAU_TICKET = 'nouveau_ticket';
export const NOTIF_NOUVEAU_TICKET_URGENT = 'nouveau_ticket_urgent';
export const NOTIF_ASSIGNATION = 'assignation_technicien';
export const NOTIF_TICKET_PRIS_EN_CHARGE = 'ticket_pris_en_charge';
export const NOTIF_NOUVEAU_MESSAGE = 'nouveau_message';
export const NOTIF_TICKET_RESOLU = 'ticket_resolu';
export const NOTIF_TICKET_FERME = 'ticket_ferme';
export const NOTIF_TICKET_FERME_URGENT = 'ticket_ferme_urgent';
export const NOTIF_RELANCE_TICKET = 'relance_ticket';
export const NOTIF_RDV_PROPOSE = 'rdv_propose';
export const NOTIF_RDV_REPONSE = 'rdv_reponse';

/** Types qui concernent la file de tickets (par opposition aux messages de chat). */
export const TYPES_NOTIF_TICKET = [
  NOTIF_NOUVEAU_TICKET,
  NOTIF_NOUVEAU_TICKET_URGENT,
  NOTIF_ASSIGNATION,
  NOTIF_TICKET_PRIS_EN_CHARGE,
  NOTIF_TICKET_RESOLU,
  NOTIF_TICKET_FERME,
  NOTIF_TICKET_FERME_URGENT,
  NOTIF_RELANCE_TICKET,
  NOTIF_RDV_PROPOSE,
  NOTIF_RDV_REPONSE,
] as const;

export const TYPES_NOTIF_URGENT = [NOTIF_NOUVEAU_TICKET_URGENT, NOTIF_TICKET_FERME_URGENT] as const;
