import { NextRequest, NextResponse } from 'next/server';

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
    return NextResponse.redirect(new URL('/connexion', request.url));
  }

  try {
    const res = await fetch(`${API_BASE_URL}/verifierSession.php`, {
      headers: { cookie },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.redirect(new URL('/connexion', request.url));
    }

    const data = await res.json();
    if (!data?.success || !data?.user) {
      return NextResponse.redirect(new URL('/connexion', request.url));
    }

    const role: string | undefined = data.user.role;
    const allowedRoles = SECTION_ROLES[section];
    if (role && !allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL('/connexion', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Backend injoignable : on ne bloque pas l'utilisateur derrière une page
    // blanche, mais on ne le laisse pas non plus dans une section protégée
    // sans avoir pu vérifier sa session.
    console.error('middleware: échec de vérification de session', error);
    return NextResponse.redirect(new URL('/connexion', request.url));
  }
}

export const config = {
  matcher: ['/admin/:path*', '/directeur/:path*', '/technicien/:path*', '/employe/:path*'],
};
