'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useRouter, usePathname } from 'next/navigation';
import { estPagePublique } from '../lib/publicPages';

export default function TechnicienNotifier() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Ne pas afficher les notifications sur les pages publiques
    if (estPagePublique(pathname)) {
      return;
    }

    // Vérifier si l'utilisateur est connecté
    const userData = localStorage.getItem('user');
    if (!userData) {
      return;
    }

    const socket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`, {
      transports: ['websocket', 'polling'],
      timeout: 5000
    });
    socket.on('nouveau_ticket', (ticket) => {
      toast.info(`Nouveau ticket de ${ticket.prenomUtilisateur || ''} ${ticket.nomUtilisateur || ''} : ${ticket.titre || ''}`);
    });
    return () => {
      socket.disconnect();
    };
  }, [pathname]);
  return null;
} 