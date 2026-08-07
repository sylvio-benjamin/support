// Il n'y a plus d'écran de choix à /connexion : chaque espace a son URL
// directe (/connexion/lyovatech, /connexion/entreprise). Cette fonction
// détermine laquelle utiliser quand on connaît la section visitée ; sans
// contexte de section (page racine, mot de passe oublié...), on retombe sur
// l'espace entreprise cliente par défaut.
const SECTIONS_LYOVATECH = ['/admin', '/directeur', '/technicien'];

export const URL_CONNEXION_DEFAUT = '/connexion/entreprise';

export function urlConnexion(pathname: string): string {
  return SECTIONS_LYOVATECH.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    ? '/connexion/lyovatech'
    : URL_CONNEXION_DEFAUT;
}
