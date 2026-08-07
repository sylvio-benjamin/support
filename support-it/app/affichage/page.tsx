'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { LogOut, Settings, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import AffichageMuralView, { AffichageTicket } from '../../components/AffichageMuralView';
import { playNotificationSound } from '../../utils/notificationSound';
import useNotificationSoundUnlock from '../../hooks/useNotificationSoundUnlock';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/support/backend/modele';
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';

// Écran mural réservé au directeur (session authentifiée) : consultation
// depuis son espace, avec navigation de retour. Pour un accès public sans
// authentification (écran physique en salle), voir /ecran-affichage/[token],
// qui réutilise le même composant AffichageMuralView.
export default function AffichageMural() {
  useNotificationSoundUnlock();
  const [tickets, setTickets] = useState<AffichageTicket[]>([]);
  const [ticketsArchives, setTicketsArchives] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [lastUpdate, setLastUpdate] = useState('à l\'instant');
  const [technicienCount, setTechnicienCount] = useState(0);
  const socketRef = useRef<any>(null);
  const previousTicketCount = useRef(0);

  const handleLogout = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;
    try {
      await fetch(`${API_BASE_URL}/deconnexion.php`, { credentials: 'include' });
      localStorage.clear();
      window.location.href = '/connexion/lyovatech';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      localStorage.clear();
      window.location.href = '/connexion/lyovatech';
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/listeTicket.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.success && data.tickets && Array.isArray(data.tickets)) {
        const ticketsTriés = data.tickets.sort((a: AffichageTicket, b: AffichageTicket) =>
          new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
        );

        if (previousTicketCount.current > 0 && ticketsTriés.length > previousTicketCount.current) {
          playNotificationSound();
        }
        previousTicketCount.current = ticketsTriés.length;

        setTickets(ticketsTriés);
        setLastUpdate('à l\'instant');
        setTimeout(() => setLastUpdate('il y a 30 sec'), 30000);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tickets:', error);
    }
  };

  const fetchTicketsArchives = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/listeTicketArchive.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.success && data.archives) {
        return data.archives;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des archives:', error);
      return [];
    }
  };

  const fetchTechnicienCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/listeTechnicien.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.techniciens) {
        setTechnicienCount(data.techniciens.length);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des techniciens:', error);
    }
  };

  useEffect(() => {
    document.title = 'Centre de Support - État des Tickets';

    setCurrentTime(new Date());
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);

    const loadInitialData = async () => {
      await fetchTickets();
      await fetchTechnicienCount();
      setTicketsArchives(await fetchTicketsArchives());
    };
    loadInitialData();

    const ticketInterval = setInterval(async () => {
      await fetchTickets();
      setTicketsArchives(await fetchTicketsArchives());
    }, 45000);

    const socket = io(WEBSOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    const rafraichir = async () => {
      await fetchTickets();
      setTicketsArchives(await fetchTicketsArchives());
    };
    socket.on('tickets_mis_a_jour', rafraichir);
    socket.on('nouveau_ticket', rafraichir);

    return () => {
      clearInterval(timeInterval);
      clearInterval(ticketInterval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <AffichageMuralView
      tickets={tickets}
      ticketsArchives={ticketsArchives}
      technicienCount={technicienCount}
      currentTime={currentTime}
      lastUpdate={lastUpdate}
      headerActions={
        <>
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => { window.location.href = '/directeur'; }}>
            Retour
          </Button>
          <Button variant="secondary" size="sm" icon={<Settings size={14} />} onClick={() => window.open('/affichage/parametres', '_blank')}>
            Paramètres
          </Button>
          <Button variant="danger" size="sm" icon={<LogOut size={14} />} onClick={handleLogout}>
            Déconnexion
          </Button>
        </>
      }
    />
  );
}
