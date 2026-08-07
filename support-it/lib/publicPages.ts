// Pages accessibles sans session : écrans de connexion et pages légales.
// Centralisé ici pour rester cohérent entre AppShell, FloatingBell et
// TechnicienNotifier, qui doivent tous éviter de sonder la session / ouvrir
// un websocket pour un visiteur anonyme sur ces pages.
const PREFIXES_PUBLICS = ['/connexion', '/mentions-legales', '/politique-confidentialite', '/politique-cookies', '/cgu'];

export function estPagePublique(pathname: string): boolean {
  return pathname === '/' || PREFIXES_PUBLICS.some((prefix) => pathname.startsWith(prefix));
}
