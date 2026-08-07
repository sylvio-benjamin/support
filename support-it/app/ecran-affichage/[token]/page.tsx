'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { ShieldAlert } from 'lucide-react';
import AffichageMuralView, { AffichageTicket } from '../../../components/AffichageMuralView';
import { playNotificationSound } from '../../../utils/notificationSound';
import useNotificationSoundUnlock from '../../../hooks/useNotificationSoundUnlock';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/support/backend/modele';
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';

// Écran mural PUBLIC, sans authentification : accès protégé uniquement par
// le token opaque dans l'URL (voir affichagePublic.php côté backend et
// getLienAffichage.php/regenererLienAffichage.php pour la gestion du lien
// par le directeur). Volontairement hors de SECTION_ROLES/middleware.ts —
// cette route n'exige aucun cookie de session.
export default function EcranAffichagePublic() {
  useNotificationSoundUnlock();
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [tickets, setTickets] = useState<AffichageTicket[]>([]);
  const [ticketsArchives, setTicketsArchives] = useState<any[]>([]);
  const [technicienCount, setTechnicienCount] = useState(0);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [lastUpdate, setLastUpdate] = useState('à l\'instant');
  const [lienInvalide, setLienInvalide] = useState(false);
  const socketRef = useRef<any>(null);
  const previousTicketCount = useRef(0);

  const fetchDonnees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/affichagePublic.php?token=${encodeURIComponent(token)}`);
      const data = await response.json();

      if (!data.success) {
        setLienInvalide(true);
        return;
      }

      const ticketsTriés = (data.tickets || []).sort((a: AffichageTicket, b: AffichageTicket) =>
        new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
      );

      if (previousTicketCount.current > 0 && ticketsTriés.length > previousTicketCount.current) {
        playNotificationSound();
      }
      previousTicketCount.current = ticketsTriés.length;

      setTickets(ticketsTriés);
      setTicketsArchives(data.archives || []);
      setTechnicienCount(data.technicienCount || 0);
      setLastUpdate('à l\'instant');
      setTimeout(() => setLastUpdate('il y a 30 sec'), 30000);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'écran d\'affichage:', error);
    }
  };

  useEffect(() => {
    if (!token) {
      setLienInvalide(true);
      return;
    }

    document.title = 'Centre de Support - État des Tickets';

    setCurrentTime(new Date());
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);

    fetchDonnees();
    const ticketInterval = setInterval(fetchDonnees, 45000);

    const socket = io(WEBSOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    socket.on('tickets_mis_a_jour', fetchDonnees);
    socket.on('nouveau_ticket', fetchDonnees);

    return () => {
      clearInterval(timeInterval);
      clearInterval(ticketInterval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (lienInvalide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <ShieldAlert size={32} className="text-red-500" />
          <h1 className="text-lg font-semibold text-slate-900">Lien invalide ou expiré</h1>
          <p className="text-sm text-slate-500">
            Ce lien d'écran d'affichage n'est plus valide. Demandez un nouveau lien à un directeur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AffichageMuralView
      tickets={tickets}
      ticketsArchives={ticketsArchives}
      technicienCount={technicienCount}
      currentTime={currentTime}
      lastUpdate={lastUpdate}
    />
  );
}
