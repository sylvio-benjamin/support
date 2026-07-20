'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function FloatingBell() {
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [unread, setUnread] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const socketRef = useRef<any>(null);

  // Ne pas afficher sur les pages publiques ou la page notifications
  const publicPages = ['/', '/connexion'];
  const isPublicPage = publicPages.includes(pathname);
  const isNotificationsPage = pathname === '/technicien/notifications';

  useEffect(() => {
    if (isPublicPage || isNotificationsPage) {
      setShow(false);
      setUnread(false);
      return;
    }

    // Vérifier si l'utilisateur est connecté
    const userData = localStorage.getItem('user');
    if (!userData) {
      setShow(false);
      setUnread(false);
      return;
    }

    setShow(false);
    setUnread(false);
    if (!socketRef.current) {
      socketRef.current = require('socket.io-client')(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`);
    }
    const handleNewMessage = (msg: any) => {
      // On ne notifie pas si on est l'expéditeur
      let userId: any = null;
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          userId = user.id;
        }
      }
      if (msg.idExpediteur === userId) return;
      setShow(true);
      setUnread(true);
      setAnimate(true);
      setTimeout(() => setAnimate(false), 1200);
    };
    socketRef.current.on('message', handleNewMessage);
    return () => {
      if (socketRef.current) {
        socketRef.current.off('message', handleNewMessage);
      }
    };
  }, [isPublicPage, isNotificationsPage]);

  if (!show || isPublicPage || isNotificationsPage) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 28,
      right: 38,
      zIndex: 9999,
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 32,
      boxShadow: '0 4px 24px rgba(76,110,245,0.10)',
      padding: 12,
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'box-shadow 0.2s',
      border: animate ? '2px solid #f43f5e' : '2px solid transparent',
      animation: animate ? 'shake 0.7s' : undefined
    }}
    onClick={() => {
      setShow(false);
      setUnread(false);
      router.push('/technicien/notifications');
    }}
    title="Voir les notifications"
    >
      <Bell size={32} color={unread ? '#f43f5e' : '#4c6ef5'} style={{ filter: unread ? 'drop-shadow(0 0 8px #f43f5e)' : undefined, transition: 'color 0.2s' }} />
      {unread && (
        <span style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: '#f43f5e',
          color: 'white',
          borderRadius: '50%',
          width: 18,
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          zIndex: 2,
          border: '2px solid #fff'
        }}>!</span>
      )}
      <style jsx global>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
} 