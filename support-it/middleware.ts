import { NextRequest, NextResponse } from 'next/server';
import { urlConnexion } from './lib/authRedirect';

// Garde-fou serveur : jusqu'ici, la protection des sections /admin, /directeur,
// /technicien, /employe reposait uniquement sur un contrôle côté client
// (lecture de localStorage dans AppShell), qu'un visiteur peut contourner en
// modifiant le JS exécuté dans son navigateur. Ce middleware vérifie la
// session PHP réelle côté serveur avant de laisser passer la requête.

const SECTION_ROLES: Record<string, string[]> = {
  '/admin': ['admin', 'referent'],
  '/directeur': ['directeur'],
  '/technicien': ['technicien'],
  '/employe': ['employe', 'utilisateur'],
  // Le rôle 'affichage' (compte kiosque) a été remplacé par un lien public à
  // token, hors middleware (voir /ecran-affichage/[token] et
  // affichagePublic.php) : /affichage reste réservé au directeur.
  '/affichage': ['directeur'],
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/support/backend/modele';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const section = Object.keys(SECTION_ROLES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!section) {
    return NextResponse.next();
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.redirect(new URL(urlConnexion(pathname), request.url));
  }

  try {
    const res = await fetch(`${API_BASE_URL}/verifierSession.php`, {
      headers: { cookie },
      cache: 'no-store',
      // Cet appel part du serveur Next.js vers le backend PHP (souvent en
      // aller-retour par le domaine public) : plus fragile qu'un fetch direct
      // depuis le navigateur. Un délai court évite qu'un aléa réseau ne bloque
      // le chargement de la page pendant de longues secondes.
      signal: AbortSignal.timeout(5000),
    });

    // Seul un 401 explicite du backend est un signal DÉFINITIF de session
    // invalide. Toute autre erreur HTTP (5xx, etc.) est traitée comme la
    // panne réseau ci-dessous : voir le commentaire du catch.
    if (res.status === 401) {
      return NextResponse.redirect(new URL(urlConnexion(pathname), request.url));
    }
    if (!res.ok) {
      throw new Error(`verifierSession.php a répondu ${res.status}`);
    }

    const data = await res.json();
    if (!data?.success || !data?.user) {
      return NextResponse.redirect(new URL(urlConnexion(pathname), request.url));
    }

    const role: string | undefined = data.user.role;
    const allowedRoles = SECTION_ROLES[section];
    if (role && !allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL(urlConnexion(pathname), request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Cet appel serveur-à-serveur peut échouer pour des raisons qui n'ont
    // RIEN à voir avec la validité de la session (aléa réseau, timeout,
    // panne temporaire) : déconnecter l'utilisateur dans ce cas précis
    // punissait un problème d'infrastructure côté serveur comme si c'était
    // le sien. On laisse donc passer la requête plutôt que de rediriger —
    // chaque endpoint PHP appelé ensuite (listeTicket.php, etc.) vérifie de
    // toute façon sa propre session et refusera l'accès si elle est
    // vraiment invalide, donc cette tolérance n'ouvre aucune faille.
    console.error('middleware: vérification de session indisponible, requête laissée passer', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/admin/:path*', '/directeur/:path*', '/technicien/:path*', '/employe/:path*', '/affichage/:path*'],
};
