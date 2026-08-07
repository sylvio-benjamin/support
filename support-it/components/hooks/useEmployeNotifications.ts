'use client';

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { TYPES_NOTIF_TICKET } from '../../lib/notificationTypes';
import { EVENEMENT_RAFRAICHIR_NOTIFICATIONS } from '../../lib/notificationEvents';

// Instance WebSocket partagée pour éviter les connexions multiples
let sharedSocket: any = null;
let socketUsers = 0;

export default function useEmployeNotifications() {
  const [unreadTicketCount, setUnreadTicketCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<any>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Debounced fetch pour éviter les appels trop fréquents
    const fetchNotifications = async () => {
      // Annuler le timeout précédent si en cours
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(async () => {
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
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5s
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getNotifications.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idUtilisateur: userId,
              typeUtilisateur: 'employe',
            }),
            credentials: 'include',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            const currentUserId = parseInt(userId);
            const notifications = (data.notifications || []).filter((notif: any) => notif.idExpediteur !== currentUserId);
            
            // Vérifier différents champs possibles pour le statut "lu"
            const unreadNotifications = notifications.filter((notif: any) => {
              const isRead = notif.lu || notif.read || notif.isRead || false;
              return !isRead;
            });
            
            // Séparation par type : le badge "Notifications" (cloche) ne doit
            // compter que les messages, pas les notifications déjà comptées
            // dans le badge "Mes tickets" (sinon les tickets sont comptés en
            // double entre les deux badges).
            const unreadTickets = unreadNotifications.filter((notif: any) => (TYPES_NOTIF_TICKET as readonly string[]).includes(notif.type));
            const unreadMessages = unreadNotifications.filter((notif: any) => !(TYPES_NOTIF_TICKET as readonly string[]).includes(notif.type));

            // Le badge compte les TICKETS distincts concernés, pas le nombre
            // brut d'événements : un ticket avec 5 nouveaux messages compte
            // pour 1, pas pour 5 (voir la page Notifications, qui regroupe de
            // la même façon).
            setUnreadTicketCount(new Set(unreadTickets.map((n: any) => n.idTicket)).size);
            setUnreadMessageCount(new Set(unreadMessages.map((n: any) => n.idTicket)).size);
          } else {
            setUnreadTicketCount(0);
            setUnreadMessageCount(0);
          }
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            console.error('Erreur lors de la récupération des notifications:', e);
          }
          setUnreadTicketCount(0);
          setUnreadMessageCount(0);
        } finally {
          setLoading(false);
        }
      }, 200); // Debounce de 200ms
    };
    fetchNotifications();
    
    // Connexion WebSocket partagée pour économiser les ressources
    if (typeof window !== 'undefined') {
      if (!sharedSocket) {
        sharedSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`, {
          transports: ['websocket', 'polling'],
          withCredentials: true
        });
      }
      
      socketUsers++;
      socketRef.current = sharedSocket;
      
      // Handlers pour les événements WebSocket
      const handleMessage = () => fetchNotifications();
      const handleNotification = () => fetchNotifications();
      
      // Écouter les nouveaux messages pour mettre à jour les badges
      sharedSocket.on('message', handleMessage);
      
      // Écouter les nouvelles notifications
      sharedSocket.on('nouvelle_notification', handleNotification);
      
      // Backup : vérification moins fréquente seulement si WebSocket échoue
      let backupInterval: NodeJS.Timeout | null = null;
      const setupBackupInterval = () => {
        if (backupInterval) clearInterval(backupInterval);
        backupInterval = setInterval(fetchNotifications, 60000); // 1 minute au lieu de 15 secondes
      };
      
      sharedSocket.on('disconnect', setupBackupInterval);
      sharedSocket.on('connect_error', setupBackupInterval);

      // Rafraîchissement immédiat après une action qui vient de marquer des
      // notifications comme lues (page Notifications visitée, ticket ouvert),
      // sans attendre le prochain sondage périodique.
      window.addEventListener(EVENEMENT_RAFRAICHIR_NOTIFICATIONS, fetchNotifications);
      window.addEventListener('focus', fetchNotifications);

      return () => {
        // Cleanup des événements spécifiques à ce hook
        if (sharedSocket) {
          sharedSocket.off('message', handleMessage);
          sharedSocket.off('nouvelle_notification', handleNotification);
        }
        window.removeEventListener(EVENEMENT_RAFRAICHIR_NOTIFICATIONS, fetchNotifications);
        window.removeEventListener('focus', fetchNotifications);

        // Nettoyer les timeouts
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        if (backupInterval) {
          clearInterval(backupInterval);
        }
        
        // Décrémenter le compteur d'utilisateurs
        socketUsers--;
        
        // Fermer la socket partagée seulement si plus personne ne l'utilise
        if (socketUsers <= 0 && sharedSocket) {
          sharedSocket.disconnect();
          sharedSocket = null;
          socketUsers = 0;
        }
      };
    }
    
    // Fallback si pas de WebSocket
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  return { unreadTicketCount, unreadMessageCount, loading };
}