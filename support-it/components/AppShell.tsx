'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Toast from './Toast';
import TechnicienNotifier from './TechnicienNotifier';
import FloatingBell from './FloatingBell';
import { SidebarProvider } from '../contexts/SidebarContext';
import { urlConnexion } from '../lib/authRedirect';
import { estPagePublique } from '../lib/publicPages';

// Équivalent App Router de l'ancien app/_app.tsx (Pages Router) : garde
// d'accès par section + notifications globales, montés une seule fois
// depuis le layout racine.
const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  referent: '/admin',
  directeur: '/directeur',
  technicien: '/technicien',
  employe: '/employe/ticket',
  utilisateur: '/employe/ticket',
};

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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const isPublicPage = estPagePublique(pathname);
  const isAdminPage = pathname.startsWith('/admin');

  // Mode compact : appliqué à chaque chargement de page (pas seulement au
  // moment où l'utilisateur clique sur "Sauvegarder" dans Paramètres), et
  // resynchronisé si la préférence change pendant que la page est ouverte.
  useEffect(() => {
    const appliquerModeCompact = () => {
      document.documentElement.classList.toggle('compact-mode', localStorage.getItem('compact_mode') === '1');
    };
    appliquerModeCompact();
    window.addEventListener('compactModeChanged', appliquerModeCompact);
    return () => window.removeEventListener('compactModeChanged', appliquerModeCompact);
  }, []);

  useEffect(() => {
    const section = Object.keys(SECTION_ROLES).find(prefix => pathname.startsWith(prefix));
    if (!section) return;

    const userData = localStorage.getItem('user');
    if (!userData) {
      router.replace(urlConnexion(pathname));
      return;
    }

    const role = localStorage.getItem('userRole');
    const allowedRoles = SECTION_ROLES[section];
    if (!role || !allowedRoles.includes(role)) {
      router.replace(ROLE_HOME[role || ''] || urlConnexion(pathname));
    }
  }, [pathname, router]);

  // Sondage de la session PHP réelle : jusqu'ici, rien ne détectait une
  // expiration de session pendant que l'utilisateur reste sur une page sans
  // naviguer (localStorage continue de dire "connecté" indéfiniment, jusqu'à
  // ce qu'un appel API échoue silencieusement). On avertit 1 minute avant
  // l'expiration (durée fixe de 8h depuis la connexion, voir
  // verifierSession.php), et on déconnecte proprement dès l'expiration réelle.
  useEffect(() => {
    if (isPublicPage) return;
    const userData = localStorage.getItem('user');
    if (!userData) return;

    let annule = false;

    const verifierSession = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/verifierSession.php`, { credentials: 'include' });
        const data = await res.json();
        if (annule) return;

        if (!data.success) {
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
          setSessionSecondsLeft(null);
          router.replace(urlConnexion(pathname));
          return;
        }

        const restant = data.session_time_remaining;
        setSessionSecondsLeft(typeof restant === 'number' && restant <= 60 ? Math.max(0, Math.round(restant)) : null);
      } catch (error) {
        // Backend injoignable : on retentera au prochain sondage, sans rien casser.
      }
    };

    verifierSession();
    const intervalle = setInterval(verifierSession, 15000);
    return () => {
      annule = true;
      clearInterval(intervalle);
    };
  }, [isPublicPage, pathname, router]);

  useEffect(() => {
    if (isPublicPage) {
      return;
    }

    const userData = localStorage.getItem('user');
    if (!userData) {
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    const currentTicketId = typeof params?.id === 'string' ? params.id : undefined;

    const handler = (msg: { idTicket: any; prenom: any; nom: any }) => {
      if (!currentTicketId || String(msg.idTicket) !== String(currentTicketId)) {
        setToast({
          visible: true,
          message: `Nouveau message de ${msg.prenom || ''} ${msg.nom || ''} sur le ticket #${msg.idTicket}`,
        });
        setTimeout(() => setToast({ visible: false, message: '' }), 5000);
      }
    };

    socket.on('message', handler);
    return () => {
      socket.off('message', handler);
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicPage, params?.id]);

  const content = (
    <>
      <TechnicienNotifier />
      <ToastContainer />
      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast({ visible: false, message: '' })} />
      {sessionSecondsLeft !== null && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          Votre session expire dans {sessionSecondsLeft}s — enregistrez votre travail, puis reconnectez-vous si besoin.
        </div>
      )}
      {children}
      <FloatingBell />
    </>
  );

  return isAdminPage ? <SidebarProvider>{content}</SidebarProvider> : content;
}
