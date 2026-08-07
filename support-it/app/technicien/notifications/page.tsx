'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import { declencherRafraichissementNotifications } from '../../../lib/notificationEvents';
import { Bell, User, Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import Button from '../../../components/ui/Button';

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
  groupCount?: number; // Nombre de messages dans le groupe
  isGrouped?: boolean; // Indique si c'est une notification groupée
}

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const socketRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
    setLastUpdate(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  // Fonction utilitaire pour récupérer l'ID utilisateur
  const getUserId = () => {
    // Essayer d'abord de récupérer depuis 'userId'
    const userId = localStorage.getItem('userId');
    if (userId && userId !== '0') {
      return userId;
    }

    // Fallback : récupérer depuis l'objet user
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const id = user.id ? user.id.toString() : '0';
        return id;
      } catch (e) {
        console.error('Erreur parsing user data:', e);
      }
    }

    return '0';
  };

  // Fonction pour vérifier si on est actuellement sur la page du ticket
  const isCurrentlyViewingTicket = (idTicket: number) => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      return currentPath === `/technicien/ticket/${idTicket}`;
    }
    return false;
  };

  // Connexion socket pour les nouvelles notifications
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = require('socket.io-client')(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`);
    }
    const handleNewMessage = (msg: any) => {
      // Ne pas afficher les notifications des messages qu'on a envoyés nous-mêmes
      const currentUserId = parseInt(getUserId());
      if (msg.idExpediteur === currentUserId) {
        return;
      }

      // Ne pas créer de notification si on est actuellement en train de regarder ce ticket
      if (isCurrentlyViewingTicket(msg.idTicket)) {
        return;
      }

      const newNotification: Notification = {
        id: Date.now(),
        idTicket: msg.idTicket,
        idExpediteur: msg.idExpediteur,
        message: msg.message,
        dateEnvoi: new Date().toISOString(),
        nom: msg.nom || 'Utilisateur',
        prenom: msg.prenom || '',
        titreTicket: msg.titreTicket || `Ticket #${msg.idTicket}`,
        statutTicket: msg.statutTicket || 'En cours',
        prioriteTicket: msg.prioriteTicket || 'Normale',
        read: false,
      };

      // Regrouper avec les notifications existantes
      setNotifications((prev) => {
        const allNotifications = [newNotification, ...prev];
        return groupNotifications(allNotifications);
      });
    };
    socketRef.current.on('message', handleNewMessage);
    return () => {
      if (socketRef.current) {
        socketRef.current.off('message', handleNewMessage);
      }
    };
  }, []);

  // Regroupe par TICKET (pas par expéditeur/fenêtre de temps) : un ticket qui
  // reçoit plusieurs événements rapprochés doit apparaître comme une seule
  // ligne "N nouvelles activités", pas comme N notifications séparées.
  const groupNotifications = (notifications: Notification[]): Notification[] => {
    if (notifications.length === 0) return [];

    const parTicket = new Map<number, Notification[]>();
    for (const n of notifications) {
      const cle = n.idTicket;
      if (!parTicket.has(cle)) parTicket.set(cle, []);
      parTicket.get(cle)!.push(n);
    }

    const grouped: Notification[] = [];
    for (const groupe of parTicket.values()) {
      const plusRecente = groupe[0];
      const toutLu = groupe.every((n) => n.read);
      if (groupe.length > 1) {
        grouped.push({
          ...plusRecente,
          groupCount: groupe.length,
          isGrouped: true,
          message: `${groupe.length} nouvelles activités`,
          read: toutLu,
        });
      } else {
        grouped.push(plusRecente);
      }
    }

    grouped.sort((a, b) => new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime());
    return grouped;
  };

  // Charger les notifications depuis la base de données
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getNotifications.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUtilisateur: getUserId(),
          typeUtilisateur: 'technicien',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        // Filtrer les notifications pour ne garder que celles reçues (pas envoyées par nous)
        const currentUserId = parseInt(getUserId());
        const receivedNotifications = (data.notifications || []).filter(
          (notif: Notification) => notif.idExpediteur !== currentUserId
        );
        // Grouper les notifications par expéditeur et proximité temporelle
        const groupedNotifications = groupNotifications(receivedNotifications);
        setNotifications(groupedNotifications);
        if (isClient) {
          setLastUpdate(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } else {
        setNotifications([]);
      }
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Visiter cette page marque tout comme lu : le badge de la sidebar doit
  // disparaître dès qu'on clique sur le lien "Notifications", pas seulement
  // au fur et à mesure qu'on clique sur chaque notification une par une.
  const marquerToutesCommeLues = async () => {
    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/markAllNotificationsRead.php`, {
        method: 'POST',
        credentials: 'include',
      });
      const donnees = await reponse.json();
      if (donnees.succes) {
        setNotifications((prev) => prev.map((n: any) => ({ ...n, read: true })));
        declencherRafraichissementNotifications();
      }
    } catch (error) {
      console.error('Erreur marquage global comme lu:', error);
    }
  };

  useEffect(() => {
    loadNotifications().finally(() => {
      marquerToutesCommeLues();
    });
  }, [isClient]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return "À l'instant";
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString('fr-FR');
  };

  const getNotificationType = (notification: Notification) => {
    const message = notification.message.toLowerCase();

    if (
      message.includes('employé') ||
      message.includes('utilisateur') ||
      message.includes('demande') ||
      message.includes('question') ||
      (notification.nom && notification.prenom && !message.includes('assigné') && !message.includes('ticket'))
    ) {
      return 'employee';
    }

    if (message.includes('urgent') || notification.prioriteTicket === 'Urgent') {
      return 'urgent';
    }

    if (message.includes('résolu') || notification.statutTicket === 'Résolu') {
      return 'resolved';
    }

    if (message.includes('maintenance')) {
      return 'maintenance';
    }

    return 'assignment'; // Pour les assignations de tickets
  };

  const getNotificationIcon = (notification: Notification) => {
    const type = getNotificationType(notification);
    if (type === 'employee') return <User size={18} />;
    if (type === 'urgent') return <AlertCircle size={18} />;
    if (type === 'resolved') return <CheckCircle size={18} />;
    if (type === 'maintenance') return <Clock size={18} />;
    return <Bell size={18} />;
  };

  const getPriorityTone = (notification: Notification): 'danger' | 'info' | 'success' => {
    if (notification.prioriteTicket === 'Urgent' || notification.message.toLowerCase().includes('urgent')) {
      return 'danger';
    }
    if (notification.prioriteTicket === 'Faible' || notification.prioriteTicket === 'Info') {
      return 'info';
    }
    return 'success';
  };

  const getPriorityLabel = (notification: Notification) => {
    if (notification.prioriteTicket === 'Urgent' || notification.message.toLowerCase().includes('urgent')) {
      return 'Urgent';
    }
    if (notification.prioriteTicket === 'Faible') {
      return 'Faible';
    }
    return 'Normal';
  };

  const goToTicket = (idTicket: number) => {
    window.location.href = `/technicien/ticket/${idTicket}`;
  };

  const markAsRead = async (notificationId: number) => {
    // Disparition immédiate de la liste (optimiste), puis on persiste côté serveur.
    // Appel direct au backend (et non via le proxy /api/notifications, qui ne
    // transmettait pas le cookie de session côté serveur — le marquage
    // n'était donc jamais réellement persisté).
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/markNotificationRead.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNotification: notificationId,
          idUtilisateur: getUserId(),
          typeUtilisateur: 'technicien',
        }),
      });
      const data = await response.json();
      if (!data.succes) {
        console.error('Erreur lors du marquage comme lu:', data.erreur);
      }
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const priorityToneClasses: Record<'danger' | 'info' | 'success', string> = {
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <DashboardLayout role="technicien">
      <PageHeader
        title="Notifications"
        description="Suivez les messages et évènements liés à vos tickets en temps réel."
        actions={
          <div className="flex items-center gap-3">
            {isClient && lastUpdate && (
              <span className="text-xs text-slate-500">Actualisé à {lastUpdate}</span>
            )}
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={loadNotifications} loading={loading}>
              Actualiser
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500 text-center py-8">Chargement des notifications...</p>
          </CardBody>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState icon={<Bell size={22} />} title="Aucune notification" description="Vous êtes à jour." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${!notification.read ? 'border-brand-200' : ''}`}
              onClick={() => {
                markAsRead(notification.id);
                if (notification.idTicket) {
                  goToTicket(notification.idTicket);
                }
              }}
            >
              <CardBody className="flex items-start gap-4">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    notification.read ? 'bg-slate-100 text-slate-500' : 'bg-brand-50 text-brand-600'
                  }`}
                >
                  {getNotificationIcon(notification)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {!notification.read && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-red-50 text-red-700">
                        Nouveau
                      </span>
                    )}
                    <span className="text-sm font-medium text-slate-900">
                      {notification.nom} {notification.prenom}
                    </span>
                    {notification.isGrouped && notification.groupCount && notification.groupCount > 1 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700">
                        {notification.groupCount}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{formatDate(notification.dateEnvoi)}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1 break-words">
                    {notification.titreTicket || `Ticket #${notification.idTicket}`}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2 break-words">{notification.message}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${priorityToneClasses[getPriorityTone(notification)]}`}>
                      {getPriorityLabel(notification)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      Ticket #{notification.idTicket}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
