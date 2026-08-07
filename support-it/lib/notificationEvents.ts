// Permet de forcer un rafraîchissement immédiat des compteurs de
// notifications (badges de la sidebar) après une action qui vient de marquer
// des notifications comme lues (visite de la page Notifications, ouverture
// d'un ticket) — sans ça, le badge ne se met à jour qu'au prochain sondage
// périodique du hook (jusqu'à 30s plus tard), ce qui donnait l'impression que
// rien ne se passait.
export const EVENEMENT_RAFRAICHIR_NOTIFICATIONS = 'notifications:refresh';

export function declencherRafraichissementNotifications(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENEMENT_RAFRAICHIR_NOTIFICATIONS));
  }
}
