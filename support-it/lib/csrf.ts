// Lit le cookie CSRF posé par le backend à la connexion (voir
// backend/config/csrf.php) pour l'attacher en header sur les requêtes
// mutantes des endpoints pilotes (assignerTicket, supprimerMessage,
// fermerTicket). Motif "double soumission de cookie" : ce cookie n'est PAS
// httpOnly, il doit être lisible ici.
export function obtenirEnTeteCsrf(): Record<string, string> {
  if (typeof document === 'undefined') return {};

  const match = document.cookie.match(/(?:^|;\s*)lyova_csrf=([^;]+)/);
  if (!match) return {};

  return { 'X-CSRF-Token': decodeURIComponent(match[1]) };
}
