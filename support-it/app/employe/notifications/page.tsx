'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Sparkles, User, Clock, AlertCircle, CheckCircle, PartyPopper, Loader2 } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import { StatutBadge, PrioriteBadge } from '../../../components/ui/Badge';
import { declencherRafraichissementNotifications } from '../../../lib/notificationEvents';

interface Notification {
  id: number | string;
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
  type?: string;
  titre?: string;
  groupCount?: number;
  isGrouped?: boolean;
}

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
    if (userId && userId !== '0') return userId;

    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.id ? user.id.toString() : '0';
      } catch (e) {
        console.error('Erreur parsing user data:', e);
      }
    }
    return '0';
  };

  const isCurrentlyViewingTicket = (idTicket: number) => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      return currentPath === `/employe/tickets/${idTicket}`;
    }
    return false;
  };

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = require('socket.io-client')(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`);
    }
    const handleNewMessage = (msg: any) => {
      const currentUserId = parseInt(getUserId());
      if (msg.idExpediteur === currentUserId) return;

      if (isCurrentlyViewingTicket(msg.idTicket)) {
        console.log(`Notification ignorée pour ticket ${msg.idTicket} car actuellement ouvert`);
        return;
      }

      const newNotification: Notification = {
        id: Date.now(),
        idTicket: msg.idTicket,
        idExpediteur: msg.idExpediteur,
        message: msg.message,
        dateEnvoi: new Date().toISOString(),
        nom: msg.nom || 'Technicien',
        prenom: msg.prenom || '',
        titreTicket: msg.titreTicket || `Ticket #${msg.idTicket}`,
        statutTicket: msg.statutTicket || 'En cours',
        prioriteTicket: msg.prioriteTicket || 'Normale',
        read: false,
      };

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

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getNotifications.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUtilisateur: userId,
          typeUtilisateur: 'utilisateur',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.succes) {
          const rawNotifications = data.notifications || [];
          // Filtrer les notifications pertinentes pour l'employé
          const currentUserId = parseInt(userId);
          const filteredNotifications = rawNotifications.filter((notif: any) => {
            if (notif.idExpediteur === currentUserId) {
              return false;
            }
            return true;
          });
          const groupedNotifications = groupNotifications(filteredNotifications);
          setNotifications(groupedNotifications);
        }
        setLastUpdate(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (error) {
      console.error('[NOTIFICATIONS] Erreur chargement:', error);
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
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        declencherRafraichissementNotifications();
      }
    } catch (error) {
      console.error('[NOTIFICATIONS] Erreur marquage global comme lu:', error);
    }
  };

  useEffect(() => {
    if (isClient) {
      loadNotifications().finally(() => {
        marquerToutesCommeLues();
      });
    }
  }, [isClient]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || (containerRef.current && containerRef.current.scrollTop > 0)) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    if (distance > 0) {
      e.preventDefault();
      const adjustedDistance = Math.min(distance * 0.5, maxPullDistance);
      setPullDistance(adjustedDistance);
    }
  };

  const handleTouchEnd = () => {
    setIsPulling(false);
    if (pullDistance > refreshThreshold) {
      setRefreshing(true);
      loadNotifications().finally(() => {
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 1000);
      });
    } else {
      setPullDistance(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (containerRef.current && containerRef.current.scrollTop > 0) return;
    startY.current = e.clientY;
    setIsPulling(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    setIsPulling(false);
    if (pullDistance > refreshThreshold) {
      setRefreshing(true);
      loadNotifications().finally(() => {
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 1000);
      });
    } else {
      setPullDistance(0);
    }
  };

  const formatDate = (dateString: string) => {
    if (!isClient) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    const message = notification.message.toLowerCase();
    const statut = notification.statutTicket?.toLowerCase();
    const priorite = notification.prioriteTicket?.toLowerCase();

    if (message.includes('assigné') || message.includes('assign')) {
      return <Bell size={14} className="text-white" />;
    }
    if (priorite === 'urgente' || message.includes('urgent')) {
      return <AlertCircle size={14} className="text-white" />;
    }
    if (statut === 'resolu' || message.includes('résolu') || message.includes('fermé')) {
      return <CheckCircle size={14} className="text-white" />;
    }
    if (message.includes('maintenance') || message.includes('planifié')) {
      return <Clock size={14} className="text-white" />;
    }
    return <User size={14} className="text-white" />;
  };

  const getIconBgClass = (notification: Notification) => {
    if (notification.read) return 'bg-slate-400';
    const message = notification.message.toLowerCase();
    const statut = notification.statutTicket?.toLowerCase();
    const priorite = notification.prioriteTicket?.toLowerCase();
    if (message.includes('assigné') || message.includes('assign')) return 'bg-blue-500';
    if (priorite === 'urgente' || message.includes('urgent')) return 'bg-red-500';
    if (statut === 'resolu' || message.includes('résolu') || message.includes('fermé')) return 'bg-emerald-500';
    if (message.includes('maintenance') || message.includes('planifié')) return 'bg-amber-500';
    return 'bg-slate-500';
  };

  const getRefreshStatus = () => {
    if (refreshing) return 'Actualisation...';
    if (pullDistance > refreshThreshold) return 'Relâchez pour actualiser';
    if (pullDistance > 20) return 'Tirez pour actualiser';
    return '';
  };

  const goToTicket = (idTicket: number) => {
    // Route corrigée : la page de détail d'un ticket employé est /employe/tickets/[id]
    // (le lien précédent pointait vers /tickets/[id], qui n'existe pas).
    window.location.href = `/employe/tickets/${idTicket}`;
  };

  const markAsRead = async (notificationId: number | string) => {
    // Disparition immédiate de la liste (optimiste), puis on persiste côté serveur
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/markNotificationRead.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNotification: notificationId,
          idUtilisateur: getUserId(),
          typeUtilisateur: 'utilisateur',
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

  return (
    <DashboardLayout role="employe">
      <PageHeader
        title="Notifications"
        description="Vos notifications en temps réel."
        actions={
          <>
            {isClient && lastUpdate && <span className="text-xs text-slate-400">Mis à jour à {lastUpdate}</span>}
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles size={14} className={refreshing ? 'animate-spin' : ''} />}
              disabled={refreshing}
              onClick={() => {
                setRefreshing(true);
                loadNotifications().finally(() => {
                  setTimeout(() => setRefreshing(false), 1000);
                });
              }}
            >
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          {/* Pull to Refresh Indicator */}
          {pullDistance > 0 && (
            <div
              className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-100 overflow-hidden"
              style={{ height: Math.max(0, pullDistance), transition: isPulling ? 'none' : 'height 0.3s ease' }}
            >
              <Loader2 size={14} className={refreshing ? 'animate-spin' : ''} />
              {getRefreshStatus()}
            </div>
          )}

          <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell size={22} />}
              title="Aucune notification"
              description={
                isClient && lastUpdate ? `Vous êtes à jour ! Dernière actualisation : ${lastUpdate}` : 'Vous êtes à jour !'
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.idTicket) {
                      goToTicket(notification.idTicket);
                    }
                  }}
                  className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !notification.read ? 'bg-brand-50/40' : ''
                  }`}
                >
                  {/* Avatar avec initiales */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-md flex items-center justify-center text-white font-semibold text-sm ${
                        notification.read ? 'bg-slate-400' : 'bg-brand-600'
                      }`}
                    >
                      {(notification.nom.charAt(0) + notification.prenom.charAt(0)).toUpperCase()}
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${getIconBgClass(
                        notification
                      )}`}
                    >
                      {getNotificationIcon(notification)}
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {!notification.read && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white bg-red-500 rounded px-1.5 py-0.5">
                          Nouveau
                        </span>
                      )}
                      <span className="text-sm font-semibold text-slate-900">
                        {notification.nom} {notification.prenom}
                      </span>
                      {notification.isGrouped && notification.groupCount && notification.groupCount > 1 && (
                        <span className="text-[11px] font-medium text-brand-700 bg-brand-50 rounded px-1.5 py-0.5">
                          {notification.groupCount} messages
                        </span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">{formatDate(notification.dateEnvoi)}</span>
                    </div>

                    <h3 className="text-sm font-medium text-slate-800 truncate mb-1">
                      {notification.titreTicket || `Ticket #${notification.idTicket}`}
                    </h3>

                    <p className="text-sm text-slate-500 line-clamp-2 mb-2">{notification.message}</p>

                    <div className="flex items-center gap-2">
                      {notification.statutTicket && <StatutBadge statut={notification.statutTicket} />}
                      {notification.prioriteTicket && <PrioriteBadge priorite={notification.prioriteTicket} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
