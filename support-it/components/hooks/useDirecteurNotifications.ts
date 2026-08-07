'use client';

import { useEffect, useState, useRef } from 'react';
import { TYPES_NOTIF_TICKET } from '../../lib/notificationTypes';
import { EVENEMENT_RAFRAICHIR_NOTIFICATIONS } from '../../lib/notificationEvents';

export default function useDirecteurNotifications() {
  const [unreadTicketCount, setUnreadTicketCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        let userId: any = null;
        if (typeof window !== 'undefined') {
          const userData = localStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            userId = user.id || user.idUtilisateur || user.idTechnicien;
          }
        }
        if (!userId) {
          setUnreadTicketCount(0);
          setUnreadMessageCount(0);
          setLoading(false);
          return;
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getNotifications.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idUtilisateur: userId,
            typeUtilisateur: 'directeur',
          }),
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();

          // Filtrer les notifications non lues
          const unreadNotifications = (data.notifications || []).filter((notif: any) => {
            const isRead = notif.read || notif.lu || notif.isRead || false;
            return !isRead;
          });
          
          // Le directeur reçoit désormais TOUTES les notifications (voir
          // getNotifications.php) : le badge "Notifications" (cloche) reflète
          // le total non lu, et le badge "Tickets" un sous-ensemble pertinent
          // pour la navigation ticket (création, assignation, changement de
          // statut), pas seulement les anciens types urgent-only.
          const unreadTickets = unreadNotifications.filter((notif: any) => (TYPES_NOTIF_TICKET as readonly string[]).includes(notif.type));

          // Le badge compte les TICKETS distincts concernés, pas le nombre
          // brut d'événements : un ticket avec 5 nouveaux messages compte
          // pour 1, pas pour 5 (voir la page Notifications, qui regroupe de
          // la même façon).
          setUnreadTicketCount(new Set(unreadTickets.map((n: any) => n.idTicket)).size);
          setUnreadMessageCount(new Set(unreadNotifications.map((n: any) => n.idTicket)).size);
        } else {
          setUnreadTicketCount(0);
          setUnreadMessageCount(0);
        }
      } catch (e) {
        console.error('Erreur lors du chargement des notifications:', e);
        setUnreadTicketCount(0);
        setUnreadMessageCount(0);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
    
    // Connexion WebSocket pour les mises à jour en temps réel
    if (typeof window !== 'undefined') {
      const socketInstance = require('socket.io-client')(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`, {
        transports: ['websocket', 'polling'],
        withCredentials: true
      });
      
      socketRef.current = socketInstance;
      
      // Écouter les nouveaux messages pour mettre à jour les badges
      socketInstance.on('message', () => {
        // Actualiser les notifications quand un nouveau message arrive
        fetchNotifications();
      });
      
      // Écouter les nouvelles notifications
      socketInstance.on('nouvelle_notification', () => {
        fetchNotifications();
      });
    }
    
    // Mise à jour automatique toutes les 30 secondes en complément du WebSocket
    const interval = setInterval(fetchNotifications, 30000);

    // Rafraîchissement immédiat après une action qui vient de marquer des
    // notifications comme lues (page Notifications visitée, ticket ouvert).
    if (typeof window !== 'undefined') {
      window.addEventListener(EVENEMENT_RAFRAICHIR_NOTIFICATIONS, fetchNotifications);
      window.addEventListener('focus', fetchNotifications);
    }

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener(EVENEMENT_RAFRAICHIR_NOTIFICATIONS, fetchNotifications);
        window.removeEventListener('focus', fetchNotifications);
      }
    };
  }, []);

  return { unreadTicketCount, unreadMessageCount, loading };
}