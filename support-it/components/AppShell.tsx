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

// Équivalent App Router de l'ancien app/_app.tsx (Pages Router) : garde
// d'accès par section + notifications globales, montés une seule fois
// depuis le layout racine.
const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  referent: '/admin',
  directeur: '/directeur',
  technicien: '/technicien',
  employe: '/employe',
  utilisateur: '/employe',
};

const SECTION_ROLES: Record<string, string[]> = {
  '/admin': ['admin', 'referent'],
  '/directeur': ['directeur'],
  '/technicien': ['technicien'],
  '/employe': ['employe', 'utilisateur'],
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [toast, setToast] = useState({ visible: false, message: '' });
  const socketRef = useRef<Socket | null>(null);

  const publicPages = ['/', '/connexion'];
  const isPublicPage = publicPages.includes(pathname);
  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    const section = Object.keys(SECTION_ROLES).find(prefix => pathname.startsWith(prefix));
    if (!section) return;

    const userData = localStorage.getItem('user');
    if (!userData) {
      router.replace('/connexion');
      return;
    }

    const role = localStorage.getItem('userRole');
    const allowedRoles = SECTION_ROLES[section];
    if (!role || !allowedRoles.includes(role)) {
      router.replace(ROLE_HOME[role || ''] || '/connexion');
    }
  }, [pathname, router]);

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
      {children}
      <FloatingBell />
    </>
  );

  return isAdminPage ? <SidebarProvider>{content}</SidebarProvider> : content;
}
