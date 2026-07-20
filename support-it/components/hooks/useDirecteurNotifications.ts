'use client';

import { useEffect, useState, useRef } from 'react';

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
          const currentUserId = parseInt(userId);
          
          // Filtrer les notifications non lues
          const unreadNotifications = (data.notifications || []).filter((notif: any) => {
            const isRead = notif.read || notif.lu || notif.isRead || false;
            return !isRead;
          });
          
          // Séparation par type - seulement les notifications importantes pour les directeurs
          const unreadTickets = unreadNotifications.filter((notif: any) => 
            notif.type === 'nouveau_ticket_urgent' || 
            notif.type === 'ticket_ferme_urgent' || 
            notif.type === 'assignation_technicien'
          );
          
          const unreadMessages = unreadNotifications.filter((notif: any) => 
            notif.type === 'nouveau_message' && 
            notif.idExpediteur !== currentUserId // Exclure ses propres messages
          );
          
          setUnreadTicketCount(unreadTickets.length);
          setUnreadMessageCount(unreadMessages.length);
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
    
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return { unreadTicketCount, unreadMessageCount, loading };
}