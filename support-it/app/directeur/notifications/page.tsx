'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, Clock, AlertCircle, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';

interface Notification {
  id: number;
  idTicket: number;
  idExpediteur: number;
  message: string;
  dateEnvoi: string;
  nom: string;
  prenom: string;
  titreTicket?: string;
  statutTicket?: string;
  prioriteTicket?: string;
  read?: boolean;
  groupCount?: number;
  isGrouped?: boolean;
  type?: string; // Added for new notification types
}

const TYPE_TONE: Record<string, 'danger' | 'success' | 'info' | 'warning' | 'neutral'> = {
  urgent: 'danger',
  resolved: 'success',
  assignment: 'info',
  employee: 'success',
  maintenance: 'warning',
};

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [refreshDots, setRefreshDots] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const socketRef = useRef<any>(null);
  const maxPullDistance = 120;
  const refreshThreshold = 80;

  useEffect(() => {
    setIsClient(true);
    setLastRefresh(new Date());
    setLastUpdate(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const getUserId = () => {
    const userId = localStorage.getItem('userId');
    if (userId && userId !== '0') {
      return userId;
    }
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const id = user.id ? user.id.toString() : '0';
        return id;
      } catch (e) {}
    }
    return '0';
  };

  useEffect(() => {
    if (refreshing) {
      let i = 0;
      const interval = setInterval(() => {
        setRefreshDots('.'.repeat((i % 3) + 1));
        i++;
      }, 400);
      return () => clearInterval(interval);
    } else {
      setRefreshDots('');
    }
  }, [refreshing]);

  const isCurrentlyViewingTicket = (idTicket: number) => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      return currentPath === `/technicien/ticket/${idTicket}`;
    }
    return false;
  };

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = require('socket.io-client')(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`);
    }
    const handleNewMessage = (msg: any) => {
      const currentUserId = parseInt(getUserId());
      if (msg.idExpediteur === currentUserId) {
        return;
      }
      if (isCurrentlyViewingTicket(msg.idTicket)) {
        return;
      }
      loadNotifications();
    };
    socketRef.current.on('message', handleNewMessage);
    return () => {
      if (socketRef.current) {
        socketRef.current.off('message', handleNewMessage);
      }
    };
  }, []);

  const groupNotifications = (notifications: Notification[]): Notification[] => {
    if (notifications.length === 0) return [];
    const grouped: Notification[] = [];
    const TIME_THRESHOLD = 5 * 60 * 1000;
    for (let i = 0; i < notifications.length; i++) {
      const current = notifications[i];
      let count = 1;
      let j = i + 1;
      while (j < notifications.length) {
        const next = notifications[j];
        const timeDiff = new Date(current.dateEnvoi).getTime() - new Date(next.dateEnvoi).getTime();
        if (next.idExpediteur === current.idExpediteur && timeDiff <= TIME_THRESHOLD) {
          count++;
          j++;
        } else {
          break;
        }
      }
      if (count > 1) {
        const groupedNotification: Notification = {
          ...current,
          groupCount: count,
          isGrouped: true,
          message: count === 2 ? `${current.message} (+1 autre message)` : `${current.message} (+${count - 1} autres messages)`
        };
        grouped.push(groupedNotification);
        i = j - 1;
      } else {
        grouped.push(current);
      }
    }
    return grouped;
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getNotifications.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUtilisateur: getUserId(),
          typeUtilisateur: 'directeur'
        }),
        credentials: 'include'
      });
      if(response.ok) {
        const data = await response.json();
        // Le backend filtre maintenant correctement les notifications pour les directeurs
        const receivedNotifications = data.notifications || [];
        const groupedNotifications = groupNotifications(receivedNotifications);
        setNotifications(groupedNotifications);
        if (isClient) {
          setLastRefresh(new Date());
          setLastUpdate(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [isClient]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance * 0.5, maxPullDistance));
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > refreshThreshold) {
      setRefreshing(true);
      loadNotifications();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (containerRef.current && containerRef.current.scrollTop > 0) return;
    startY.current = e.clientY;
    setIsPulling(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPulling || (containerRef.current && containerRef.current.scrollTop > 0)) return;
    const currentY = e.clientY;
    const distance = Math.max(0, currentY - startY.current);
    if (distance > 0) {
      e.preventDefault();
      const adjustedDistance = Math.min(distance * 0.5, maxPullDistance);
      setPullDistance(adjustedDistance);
    }
  };

  const handleMouseUp = () => {
    if (isPulling && pullDistance > refreshThreshold) {
      setRefreshing(true);
      loadNotifications();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  useEffect(() => {
    if (isPulling) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPulling, pullDistance]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString('fr-FR');
  };

  const getNotificationIcon = (notification: Notification) => {
    const message = notification.message.toLowerCase();
    const type = notification.type?.toLowerCase();

    // Nouveaux tickets urgents
    if (type === 'nouveau_ticket_urgent' || message.includes('nouveau ticket urgent')) {
      return <AlertCircle size={18} />;
    }

    // Tickets urgents fermés
    if (type === 'ticket_ferme_urgent' || message.includes('ticket urgent fermé')) {
      return <CheckCircle size={18} />;
    }

    // Assignations de techniciens
    if (type === 'assignation_technicien' || message.includes('assigné') || message.includes('assign')) {
      return <User size={18} />;
    }

    // Messages d'employés/utilisateurs
    if (message.includes('employé') ||
        message.includes('utilisateur') ||
        message.includes('demande') ||
        message.includes('question') ||
        (notification.nom && notification.prenom && !message.includes('assigné') && !message.includes('ticket'))) {
      return <User size={18} />;
    }

    // Tickets urgents
    if (message.includes('urgent') || notification.prioriteTicket === 'Urgent') {
      return <AlertCircle size={18} />;
    }

    // Tickets résolus
    if (message.includes('résolu') || notification.statutTicket === 'Résolu') {
      return <CheckCircle size={18} />;
    }

    // Maintenance
    if (message.includes('maintenance')) {
      return <Clock size={18} />;
    }

    return <Bell size={18} />;
  };

  const getNotificationType = (notification: Notification) => {
    const message = notification.message.toLowerCase();
    const type = notification.type?.toLowerCase();

    // Nouveaux tickets urgents
    if (type === 'nouveau_ticket_urgent' || message.includes('nouveau ticket urgent')) {
      return 'urgent';
    }

    // Tickets urgents fermés
    if (type === 'ticket_ferme_urgent' || message.includes('ticket urgent fermé')) {
      return 'resolved';
    }

    // Assignations de techniciens
    if (type === 'assignation_technicien' || message.includes('assigné') || message.includes('assign')) {
      return 'assignment';
    }

    // Messages d'employés/utilisateurs
    if (message.includes('employé') ||
        message.includes('utilisateur') ||
        message.includes('demande') ||
        message.includes('question') ||
        (notification.nom && notification.prenom && !message.includes('assigné') && !message.includes('ticket'))) {
      return 'employee';
    }

    // Tickets urgents
    if (message.includes('urgent') || notification.prioriteTicket === 'Urgent') {
      return 'urgent';
    }

    // Tickets résolus
    if (message.includes('résolu') || notification.statutTicket === 'Résolu') {
      return 'resolved';
    }

    // Maintenance
    if (message.includes('maintenance')) {
      return 'maintenance';
    }

    return 'assignment';
  };

  const getPriorityLabel = (notification: Notification) => {
    const type = notification.type?.toLowerCase();
    const message = notification.message.toLowerCase();

    // Nouveaux tickets urgents
    if (type === 'nouveau_ticket_urgent' || message.includes('nouveau ticket urgent')) {
      return 'Nouveau ticket urgent';
    }

    // Tickets urgents fermés
    if (type === 'ticket_ferme_urgent' || message.includes('ticket urgent fermé')) {
      return 'Ticket urgent fermé';
    }

    // Assignations de techniciens
    if (type === 'assignation_technicien' || message.includes('assigné') || message.includes('assign')) {
      return 'Assignation technicien';
    }

    if (notification.prioriteTicket === 'Urgent' || notification.message.toLowerCase().includes('urgent')) {
      return 'Urgent';
    }
    if (notification.prioriteTicket === 'Faible') {
      return 'Faible';
    }
    return 'Normal';
  };

  const goToTicket = (idTicket: number) => {
    window.location.href = `/directeur/ticket/${idTicket}`;
  };

  const markAsRead = async (notificationId: number) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/markNotificationRead.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNotification: notificationId,
          idUtilisateur: getUserId(),
          typeUtilisateur: 'directeur'
        }),
        credentials: 'include'
      });
      if (!response.ok) {
        console.error('Erreur HTTP lors du marquage comme lu:', response.status);
      }
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const supprimerNotification = async (notificationId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Empêcher le clic sur la notification

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/supprimerNotification.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNotification: notificationId
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Supprimer la notification de la liste locale
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      } else {
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error: unknown) {
      console.error('Erreur lors de la suppression:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('HTTP: 500')) {
        alert('Erreur serveur lors de la suppression. Veuillez réessayer.');
      } else if (errorMessage.includes('HTTP: 403')) {
        alert('Accès non autorisé. Veuillez vous reconnecter.');
      } else {
        alert('Erreur réseau lors de la suppression. Vérifiez votre connexion.');
      }
    }
  };

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title="Notifications"
        description="Vos notifications"
        actions={
          <Button variant="primary" icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} onClick={() => loadNotifications()} loading={false} disabled={loading}>
            {loading ? 'Chargement...' : 'Actualiser'}
          </Button>
        }
      />

      <Card>
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-16">Chargement...</p>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={22} />}
            title="Aucune notification"
            description={isClient && lastUpdate ? `Vous êtes à jour ! Dernière actualisation : ${lastUpdate}` : 'Vous êtes à jour !'}
          />
        ) : (
          <div>
            {notifications.map((notification) => {
              const type = getNotificationType(notification);
              const tone = TYPE_TONE[type] || 'neutral';
              return (
                <div
                  key={notification.id}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.idTicket) {
                      goToTicket(notification.idTicket);
                    }
                  }}
                  className={`flex items-start gap-3 p-4 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 ${!notification.read ? 'bg-brand-50/40' : ''}`}
                >
                  <span className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${!notification.read ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                    {getNotificationIcon(notification)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {!notification.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />}
                      <span className="text-sm font-medium text-slate-900">{notification.nom} {notification.prenom}</span>
                      {notification.isGrouped && notification.groupCount && notification.groupCount > 1 && (
                        <Badge tone="brand">{notification.groupCount}</Badge>
                      )}
                      <span className="text-xs text-slate-400 ml-auto shrink-0">{formatDate(notification.dateEnvoi)}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{notification.titreTicket || `Ticket #${notification.idTicket}`}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{notification.message}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge tone={tone}>{getPriorityLabel(notification)}</Badge>
                      <Badge tone="neutral">Ticket #{notification.idTicket}</Badge>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Trash2 size={13} />}
                        onClick={(e) => supprimerNotification(notification.id, e)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
