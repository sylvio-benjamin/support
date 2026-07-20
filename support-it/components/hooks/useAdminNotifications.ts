'use client';

import { useEffect, useState, useRef } from 'react';

export default function useAdminNotifications() {
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
            userId = user.id || user.idUtilisateur;
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
            typeUtilisateur: 'admin',
          }),
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const currentUserId = parseInt(userId);
          const notifications = (data.notifications || []).filter((notif: any) => notif.idExpediteur !== currentUserId);
          
          // Vérifier différents champs possibles pour le statut "lu"
          const unreadNotifications = notifications.filter((notif: any) => {
            const isRead = notif.lu || notif.read || notif.isRead || false;
            return !isRead;
          });
          
          // Séparation par type
          const unreadTickets = unreadNotifications.filter((notif: any) => notif.type === 'nouveau_ticket' || notif.type === 'assignation_technicien');
          const unreadMessages = unreadNotifications.filter((notif: any) => !notif.type || notif.type === 'message' || notif.type === undefined);
          
          // Compter toutes les notifications non lues comme messages pour l'instant
          const totalUnread = unreadNotifications.length;
          
          setUnreadTicketCount(unreadTickets.length);
          setUnreadMessageCount(totalUnread);
        } else {
          setUnreadTicketCount(0);
          setUnreadMessageCount(0);
        }
      } catch (e) {
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
    
    // Mise à jour automatique toutes les 15 secondes en complément du WebSocket
    const interval = setInterval(fetchNotifications, 15000);
    
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return { unreadTicketCount, unreadMessageCount, loading };
}