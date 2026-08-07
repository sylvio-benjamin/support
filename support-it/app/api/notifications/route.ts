import { NextRequest, NextResponse } from 'next/server';

// Proxy vers le backend PHP pour les actions de notification.
// Anciennement `api/notifications.ts` (format Pages Router `NextApiRequest`/
// `NextApiResponse`) qui n'était jamais servi car placé hors de `pages/api`
// et `app/api` — tous les appels frontend à `/api/notifications` échouaient
// silencieusement en 404. Reconstruit ici au format App Router (`route.ts`)
// pour que ces appels fonctionnent réellement.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/support/backend/modele';

export async function POST(request: NextRequest) {
  try {
    const { action, idUtilisateur, idNotification, typeUtilisateur, idTicket } = await request.json();

    // Ce endpoint tourne côté serveur Next.js et relaie vers le backend PHP :
    // le navigateur n'est pas impliqué dans cet appel, donc le cookie de
    // session n'est PAS transmis automatiquement (contrairement à un fetch()
    // avec credentials:'include' fait depuis le client). Sans le forwarder
    // explicitement, le backend PHP ne voit jamais la session et répond 401
    // à chaque appel — exactement le même bug que celui déjà corrigé dans
    // middleware.ts.
    const cookie = request.headers.get('cookie') || '';

    if (action === 'getNotifications') {
      const reponseApi = await fetch(`${API_BASE_URL}/getNotifications.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({
          idUtilisateur,
          typeUtilisateur: typeUtilisateur || 'utilisateur',
        }),
      });
      const donnees = await reponseApi.json();
      return NextResponse.json(donnees, { status: reponseApi.status });
    }

    if (action === 'markAsRead') {
      const reponseApi = await fetch(`${API_BASE_URL}/markNotificationRead.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ idNotification, idUtilisateur }),
      });
      const donnees = await reponseApi.json();
      return NextResponse.json(donnees, { status: reponseApi.status });
    }

    if (action === 'markTicketNotificationsAsRead') {
      const reponseApi = await fetch(`${API_BASE_URL}/markTicketNotificationsRead.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ idTicket, idUtilisateur }),
      });
      const donnees = await reponseApi.json();
      return NextResponse.json(donnees, { status: reponseApi.status });
    }

    return NextResponse.json({ erreur: 'Action non reconnue' }, { status: 400 });
  } catch (erreur) {
    console.error('Erreur API notifications:', erreur);
    return NextResponse.json({ erreur: 'Erreur serveur' }, { status: 500 });
  }
}
