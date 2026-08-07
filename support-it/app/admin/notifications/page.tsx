'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Sparkles, User, Clock, AlertCircle, CheckCircle, PartyPopper, RefreshCw } from 'lucide-react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Badge, StatutBadge, PrioriteBadge } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
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

export default function NotificationsAdmin() {
  useAuthRedirect();
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
      return currentPath === `/admin/ticket/${idTicket}`;
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
        nom: msg.nom || 'Utilisateur',
        prenom: msg.prenom || '',
        titreTicket: msg.titreTicket || `Ticket #${msg.idTicket}`,
        statutTicket: msg.statutTicket || 'En cours',
        prioriteTicket: msg.prioriteTicket || 'Normale',
        read: false
      };

      setNotifications(prev => {
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
  // ligne "N nouvelles activités", pas comme N notifications séparées — la
  // liste reste lisible même quand un ticket est très actif.
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
      // La plus récente en tête (les notifications arrivent déjà triées par
      // date décroissante depuis getNotifications.php).
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
          typeUtilisateur: 'admin'
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.succes) {
          const rawNotifications = data.notifications || [];
          // Filtrer les notifications pertinentes pour l'admin
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
      return <Bell size={12} />;
    }
    if (priorite === 'urgente' || message.includes('urgent')) {
      return <AlertCircle size={12} />;
    }
    if (statut === 'resolu' || message.includes('résolu') || message.includes('fermé')) {
      return <CheckCircle size={12} />;
    }
    if (message.includes('maintenance') || message.includes('planifié')) {
      return <Clock size={12} />;
    }
    return <User size={12} />;
  };

  const getProgressPercentage = () => {
    return Math.min((pullDistance / refreshThreshold) * 100, 100);
  };

  const getRefreshStatus = () => {
    if (refreshing) return `Actualisation${refreshDots}`;
    if (pullDistance > refreshThreshold) return 'Relâchez pour actualiser';
    if (pullDistance > 20) return 'Tirez pour actualiser';
    return '';
  };

  const goToTicket = (idTicket: number) => {
    window.location.href = `/admin/ticket/${idTicket}`;
  };

  const markAsRead = async (notificationId: number | string) => {
    // Disparition immédiate de la liste (optimiste), puis on persiste côté serveur
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/markNotificationRead.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNotification: notificationId,
          idUtilisateur: getUserId(),
          typeUtilisateur: 'admin',
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

  const obtenirInitiales = (nom: string, prenom: string) => (nom.charAt(0) + prenom.charAt(0)).toUpperCase();

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Notifications"
        description="Suivez en temps réel les messages liés à vos tickets."
        actions={
          <div className="flex items-center gap-3">
            {isClient && lastUpdate && (
              <span className="text-xs text-slate-500">Dernière mise à jour : {lastUpdate}</span>
            )}
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
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
          </div>
        }
      />

      <Card className="overflow-hidden">
        {/* Indicateur pull-to-refresh */}
        {pullDistance > 0 && (
          <div
            className="flex items-center justify-center gap-2 text-sm text-slate-500 border-b border-slate-100 bg-slate-50 overflow-hidden"
            style={{ height: Math.max(0, pullDistance), transition: isPulling ? 'none' : 'height 0.3s ease' }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ opacity: getProgressPercentage() / 100 }} />
            {getRefreshStatus()}
          </div>
        )}

        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className="max-h-[560px] overflow-y-auto"
        >
          {loading ? (
            <div className="text-center text-slate-500 py-16">Chargement...</div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell size={22} />}
              title="Aucune notification"
              description={
                isClient && lastUpdate
                  ? `Vous êtes à jour. Dernière actualisation : ${lastUpdate}`
                  : 'Vous êtes à jour.'
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
                    notification.read ? '' : 'bg-brand-50/40'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      notification.read ? 'bg-slate-300 text-white' : 'bg-brand-600 text-white'
                    }`}
                  >
                    {obtenirInitiales(notification.nom, notification.prenom)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {!notification.read && <Badge tone="danger">Nouveau</Badge>}
                      <span className="text-sm font-semibold text-slate-900">{notification.nom} {notification.prenom}</span>
                      <span className="text-xs text-slate-400 ml-auto shrink-0">{formatDate(notification.dateEnvoi)}</span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 truncate flex items-center gap-1.5">
                      <span className="text-slate-400">{getNotificationIcon(notification)}</span>
                      {notification.titreTicket || `Ticket #${notification.idTicket}`}
                    </p>

                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{notification.message}</p>

                    <div className="flex gap-2 items-center mt-2">
                      {notification.statutTicket && <StatutBadge statut={notification.statutTicket} />}
                      {notification.prioriteTicket && <PrioriteBadge priorite={notification.prioriteTicket} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}
