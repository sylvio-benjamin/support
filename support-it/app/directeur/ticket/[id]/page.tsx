'use client';

import React, { useEffect, useState, useRef } from 'react';

import { useRouter, useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import WidgetRdv from '../../widgetrdv';
import Avatar from '../../../../components/Avatar';
import { Send, Paperclip, Lock, CheckCircle2, XCircle, X, Plus, Share2, CalendarClock, ArrowLeft } from 'lucide-react';
import DashboardLayout from '../../../../components/ui/DashboardLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card';
import { Select, Textarea } from '../../../../components/ui/Input';
import Button from '../../../../components/ui/Button';
import { StatutBadge, PrioriteBadge } from '../../../../components/ui/Badge';


export default function TicketDetailTechnicien() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [showShare, setShowShare] = useState(false);
  const [selectedTech, setSelectedTech] = useState('');
  const [shareMsg, setShareMsg] = useState('');
  const [techniciens, setTechniciens] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File|null>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRdvModal, setShowRdvModal] = useState(false);

  // États pour la lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string|null>(null);

  // États pour la clôture de ticket
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [rapport, setRapport] = useState('');
  const [includeRapport, setIncludeRapport] = useState(false);
  const [clotureLoading, setClotureLoading] = useState(false);
  const [statutCloture, setStatutCloture] = useState<'resolu' | 'ferme'>('resolu');
  const [fichiersTicket, setFichiersTicket] = useState<string[]>([]);

  // Fonction pour charger les fichiers du ticket
  const chargerFichiersTicket = async (idTicket: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php?idTicket=${idTicket}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data && data.success && data.tickets && data.tickets.length > 0) {
        const ticket = data.tickets[0];
        if (ticket.fichiers && Array.isArray(ticket.fichiers)) {
          setFichiersTicket(ticket.fichiers);
        } else {
          setFichiersTicket([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers du ticket:', error);
      setFichiersTicket([]);
    }
  };

useEffect(() => {
  const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
  socketRef.current = socket;

  return () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };
}, []);

  useEffect(() => {
    if (!id) return;
    // Les directeurs ont accès à tous les tickets par défaut
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php?idTicket=${id}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(async data => {
        if (data && data.success && data.tickets && data.tickets.length > 0) {
          setTicket(data.tickets[0]);
          // Charger les fichiers du ticket
          await chargerFichiersTicket(id as string);
        } else {
          throw new Error('Ticket non trouvé');
        }
      })
      .catch(error => {
        console.error('Erreur lors du chargement du ticket:', error);
        alert('Erreur lors du chargement du ticket.');
        router.push('/directeur/tickets');
      });

    // Récupérer les données utilisateur
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      console.log('user localStorage:', parsed);

      // Si le user du localStorage n'est pas directeur, on force un user par défaut directeur
      if (parsed.role && parsed.role.toLowerCase() === 'directeur') {
        // S'assurer que l'ID est correctement défini et récupérer le vrai nom/prénom
        const directeurUser = {
          ...parsed,
          role: 'Directeur',
          // Utiliser l'ID directeur s'il existe, sinon créer un ID par défaut
          id: parsed.idDirecteur || parsed.id || 1,
          idDirecteur: parsed.idDirecteur || parsed.id || 1,
          // S'assurer que le nom et prénom sont corrects
          nom: parsed.nom || parsed.nomDirecteur || parsed.nomUtilisateur || 'Directeur',
          prenom: parsed.prenom || parsed.prenomDirecteur || parsed.prenomUtilisateur || ''
        };
        console.log('Directeur configuré:', directeurUser);
        setUser(directeurUser);
      } else {
        // Utiliser les données du localStorage même si le rôle n'est pas directeur
        const fallbackDirecteur = {
          nom: parsed.nom || parsed.nomDirecteur || parsed.nomUtilisateur || 'Directeur',
          prenom: parsed.prenom || parsed.prenomDirecteur || parsed.prenomUtilisateur || '',
          role: 'Directeur',
          id: parsed.idDirecteur || parsed.id || 1,
          idDirecteur: parsed.idDirecteur || parsed.id || 1
        };
        console.log('Directeur fallback (rôle différent):', fallbackDirecteur);
        setUser(fallbackDirecteur);
      }
    } else {
      // Pas de localStorage, utiliser un directeur par défaut
      const defaultDirecteur = {
        nom: 'Directeur',
        prenom: '',
        role: 'Directeur',
        id: 1,
        idDirecteur: 1
      };
      console.log('Directeur par défaut (pas de localStorage):', defaultDirecteur);
      setUser(defaultDirecteur);
    }

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTechnicien.php`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.techniciens) setTechniciens(data.techniciens);
      });
  }, [id]);

  // Charger les messages existants du ticket
  useEffect(() => {
    if (!id) return;

    const chargerMessages = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getChatMessages.php?idTicket=${id}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            console.log('Messages chargés:', data);
            setMessages(data);
          } else {
            console.log('Erreur récupération messages:', data.erreur || 'Format invalide');
            setMessages([]);
          }
        } else {
          console.error('Erreur lors du chargement des messages:', response.statusText);
          setMessages([]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
        setMessages([]);
      }
    };

    chargerMessages();
  }, [id]);

  useEffect(() => {
    if (!id || !socketRef.current) return;
    const handler = (ticketsMaj: any[]) => {
      // ticketsMaj peut être un tableau de tickets
      if (Array.isArray(ticketsMaj)) {
        const t = ticketsMaj.find(tk => String(tk.idTicket) === String(id));
        if (t) {
          console.log('[DEBUG][WS] ticket maj:', t);
          setTicket(t);
        }
      }
    };
    socketRef.current.on('tickets_mis_a_jour', handler);
    return () => {
      socketRef.current.off('tickets_mis_a_jour', handler);
    };
  }, [id]);

  // Fonction pour charger les messages du ticket
  const chargerMessages = async () => {
    if (!id) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getChatMessages.php?idTicket=${id}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          console.log('Messages chargés:', data);
          setMessages(data);
        } else {
          console.log('Erreur récupération messages:', data.erreur || 'Format invalide');
          setMessages([]);
        }
      } else {
        console.error('Erreur lors du chargement des messages:', response.statusText);
        setMessages([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      setMessages([]);
    }
  };

  // Charger les messages au montage du composant
  useEffect(() => {
    chargerMessages();
  }, [id]);

  // Fonction pour marquer les notifications du ticket comme lues
  const marquerNotificationsTicketLues = async () => {
    if (!id || !user?.id) return;

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markTicketNotificationsAsRead',
          idUtilisateur: user.id,
          idTicket: id
        })
      });
      console.log('Notifications du ticket marquées comme lues');
    } catch (error) {
      console.error('Erreur lors du marquage des notifications:', error);
    }
  };

  // Fonction pour marquer les messages du ticket comme lus
  const marquerMessagesTicketLus = async () => {
    if (!id || !user?.id) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/marquerMessagesLus.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          idTicket: id
        })
      });
      const data = await response.json();
      if (data.success) {
        console.log('Messages du ticket marqués comme lus (directeur)');
      } else {
        console.error('Erreur marquage messages:', data.error);
      }
    } catch (error) {
      console.error('Erreur lors du marquage des messages:', error);
    }
  };

  // Fonction pour indiquer l'activité sur le ticket
  const setUserActiveOnTicket = async (isActive: boolean) => {
    if (!id || !user?.id) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/setUserActiveOnTicket.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUtilisateur: user.id,
          idTicket: id,
          isActive: isActive
        })
      });
      console.log(`Utilisateur marqué comme ${isActive ? 'actif' : 'inactif'} sur le ticket`);
    } catch (error) {
      console.error('Erreur lors du marquage d\'activité:', error);
    }
  };

  // Gestion du chat temps réel
  useEffect(() => {
    if (!id || !user || !socketRef.current) return;

    // Charger l'historique
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getChatMessages.php?idTicket=${id}`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          console.error('Erreur récupération messages:', data.erreur || 'Format invalide');
          setMessages([]);
        }
      })
      .catch(err => {
        console.error('Erreur chargement messages:', err);
        setMessages([]);
      });

    // Rejoindre la room
    socketRef.current.emit('joinRoom', `ticket-${id}`);

    // Marquer l'utilisateur comme actif sur ce ticket
    setUserActiveOnTicket(true);

    // Maintenir l'activité toutes les 8 secondes
    const intervalActivite = setInterval(() => {
      setUserActiveOnTicket(true);
    }, 8000);

            // Marquer les notifications existantes comme lues dès l'arrivée sur la page
        marquerNotificationsTicketLues();

        // Marquer les messages comme lus
        marquerMessagesTicketLus();

    // Listener unique
    const handler = (msg: any) => {
      // Éviter les doublons en vérifiant si le message existe déjà
      setMessages((prev) => {
        const messageExists = prev.some(existingMsg =>
          existingMsg.message === msg.message &&
          existingMsg.dateEnvoi === msg.dateEnvoi &&
          existingMsg.idExpediteur === msg.idExpediteur
        );

        if (messageExists) {
          console.log('Message déjà présent, ignoré:', msg);
          return prev;
        }

        console.log('Nouveau message reçu:', msg);
        return [...prev, msg];
      });

      // Si le message ne vient pas de moi, marquer automatiquement comme lu
      if (msg.idExpediteur !== (user.idDirecteur ?? user.idTechnicien ?? user.id)) {
        marquerNotificationsTicketLues();
        marquerMessagesTicketLus();
      }

      // Auto-scroll vers le bas du chat après un court délai
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 100);
    };

    socketRef.current.on('message', handler);

    // Gestion de la fermeture de page avec beacon (plus fiable)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page cachée (changement d'onglet, fermeture, etc.)
        navigator.sendBeacon(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/setUserActiveOnTicket.php`,
          JSON.stringify({
            idUtilisateur: user.id,
            idTicket: id,
            isActive: false
          })
        );
      }
    };

    const handleBeforeUnload = () => {
      // Backup avec sendBeacon
      navigator.sendBeacon(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/setUserActiveOnTicket.php`,
        JSON.stringify({
          idUtilisateur: user.id,
          idTicket: id,
          isActive: false
        })
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Nettoyer l'interval
      clearInterval(intervalActivite);
      // Nettoyer les listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Marquer l'utilisateur comme inactif quand il quitte la page
      setUserActiveOnTicket(false);
      socketRef.current.off('message', handler);
    };
  }, [id, user]);



  // Ajout d'un debug visuel juste avant le return principal
  console.log('[DEBUG] ticket courant:', ticket);

  if (!ticket) {
    return (
      <DashboardLayout role="directeur">
        <p className="text-sm text-slate-500 text-center py-16">Chargement...</p>
      </DashboardLayout>
    );
  }
  if (!user) {
    return (
      <DashboardLayout role="directeur">
        <p className="text-sm text-slate-500 text-center py-16">Chargement utilisateur...</p>
      </DashboardLayout>
    );
  }

  // Pour l'affichage du nom assigné
  const assignedUser = ticket.nomTechnicien || ticket.nomAssignee || ticket.assignee?.nom || '—';
  const assignedInitials = assignedUser.split(' ').map((n: string) => n[0]).join('').toUpperCase();

  // Fonction mock de partage
  const partagerTicket = () => {
    if (!selectedTech) return;

    const tech = techniciens.find(t => t.idTechnicien == selectedTech);
  if (!tech) return;
console.log('Partage du ticket avec:', tech,selectedTech);
console.log(ticket.idTicket);
  setShareMsg(`Ticket partagé avec `, );

  fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/PartageUnTicket.php`, {
    method: 'POST',

    body: JSON.stringify({
      idTechnicien: selectedTech,
     idTicket: ticket.idTicket

    })
  })
  .then(async (response) => {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      console.log(data);
    } catch (err) {
      console.error("Réponse non-JSON ou vide :", text);
    }
  })
  .catch((error) => {
    console.error("Erreur réseau :", error);
  });
};


  function getInitials(nom: string, prenom: string, nomExpediteur?: string, prenomExpediteur?: string, nomUtilisateur?: string) {
    const n = nom || nomExpediteur || nomUtilisateur || '';
    const p = prenom || prenomExpediteur || '';
    return ((p?.[0] || '') + (n?.[0] || '')).toUpperCase();
  }

  function getColorFromName(nom: string) {
    // Simple hash for color
    const colors = ['#6B46C1', '#4c6ef5', '#22c55e', '#eab308', '#ef4444'];
    let sum = 0;
    for (let i = 0; i < nom.length; i++) sum += nom.charCodeAt(i);
    return colors[sum % colors.length];
  }

  // Nouvelle fonction d'envoi de message avec pièce jointe
  const gererEnvoiMessage = async () => {
    if (!message.trim() && !file) return;

    const messageText = message.trim();
    setMessage(''); // Vider le champ immédiatement
    setFile(null); // Vider le fichier immédiatement

    try {
      // Pour le directeur, utiliser l'ID directeur
      const idExpediteur = user.idDirecteur ?? user.idTechnicien ?? user.id;
      console.log('ID expéditeur directeur:', idExpediteur, 'User:', user);

      let fichierJoint: string | null = null;

      if (file) {
        const formData = new FormData();
        formData.append('pieceJointe', file);
        formData.append('idTicket', ticket.idTicket);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploadChatFile.php`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        console.log('[DEBUG][UPLOAD] Réponse uploadChatFile:', data);
        if (data.success && data.cheminFichier) {
          fichierJoint = data.cheminFichier;
        } else {
          alert('Erreur upload fichier : ' + (data.error || 'inconnue'));
          return;
        }
      }

      const nouveauMessage = {
        idTicket: ticket.idTicket,
        idExpediteur,
        nom: user.nom || user.nomDirecteur || user.nomUtilisateur || 'Directeur',
        prenom: user.prenom || user.prenomDirecteur || user.prenomUtilisateur || '',
        avatar: user.avatar || null,
        message: messageText,
        dateEnvoi: new Date().toISOString(),
        fichierJoint,
        // Ajouter des informations pour identifier le directeur
        roleExpediteur: 'directeur',
        idDirecteur: user.idDirecteur || user.id
      };

      console.log('Nom/Prénom directeur dans le message:', nouveauMessage.nom, nouveauMessage.prenom);

      console.log('Message envoyé:', nouveauMessage);

      // Ajouter le message à l'état local immédiatement
      setMessages(prev => [...prev, nouveauMessage]);

      // Envoyer via WebSocket
      socketRef.current.emit('message', nouveauMessage);

      // Sauvegarder en base de données
      const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/saveChatMessage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(nouveauMessage)
      });

      if (!saveResponse.ok) {
        console.error('Erreur sauvegarde message:', saveResponse.statusText);
        // Optionnel : retirer le message de l'état local si la sauvegarde échoue
        // setMessages(prev => prev.filter(m => m !== nouveauMessage));
      }

      // Auto-scroll vers le bas du chat après envoi
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 100);

    } catch (erreur) {
      console.error('Erreur envoi message:', erreur);
      // Remettre le message dans le champ en cas d'erreur
      setMessage(messageText);
    }
  };

  // Fonctions de clôture de ticket (même logique que technicien)
  const cloturerTicket = async (valeur: string) => {
    setShowClotureModal(true);
    setStatutCloture('resolu');
  };

  const cloturerTicketAvecRapport = async () => {
    setClotureLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fermerTicket.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          idTicket: ticket.idTicket,
          reponse: statutCloture,
          rapport: includeRapport ? rapport : null
        })
      });
      const data = await response.json();

      if (!data.succes) {
        alert('Erreur lors de la clôture du ticket : ' + (data.erreur || 'Erreur inconnue'));
        return;
      }

      setShowClotureModal(false);
      setRapport('');
      setIncludeRapport(false);
      setStatutCloture('resolu');
      window.location.href = '/directeur/tickets';
    } catch (erreur) {
      console.error('Erreur fermeture ticket:', erreur);
      alert('Erreur lors de la clôture du ticket');
    } finally {
      setClotureLoading(false);
    }
  };

function SharedTicketCard({ ticket }: { ticket: any }) {
  return (
    <Card className="relative">
      <CardBody>
        <span className="absolute top-4 right-5 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-700">
          <Share2 size={12} /> Partagé
        </span>
        <h2 className="text-lg font-semibold text-slate-900 mb-2 pr-24">{ticket.titre}</h2>
        <div className="text-sm text-slate-600 max-h-[200px] overflow-y-auto whitespace-pre-wrap mb-3">{ticket.description}</div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="text-sm font-semibold text-brand-600">#{ticket.idTicket}</span>
          <StatutBadge statut={ticket.statut} />
          {ticket.priorite === 'urgent' && <span className="text-xs font-semibold text-red-600">Urgent</span>}
        </div>
        <div className="text-sm text-slate-500">
          <span className="font-medium text-slate-700">Client :</span> {ticket.nomClient}
          {ticket.nomPartageur && (
            <span className="ml-4 text-brand-600 font-medium">Partagé par : {ticket.nomPartageur}</span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

  const safeUser = user ? { ...user, role: 'Directeur' } : { nom: 'Directeur', prenom: '', role: 'Directeur' };
  void safeUser; // conservé — la sidebar est désormais gérée par DashboardLayout

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title={`Ticket #${ticket.idTicket} — ${ticket.titre}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatutBadge statut={ticket.statut} />
            <PrioriteBadge priorite={ticket.priorite} />
            <Button variant="primary" onClick={() => cloturerTicket('resolu')}>Fermer le ticket</Button>
            <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => router.push('/directeur/tickets')}>Retour</Button>
            <Button variant="secondary" icon={<Share2 size={16} />} onClick={() => setShowShare(v => !v)}>Partager le ticket</Button>
            <Button variant="secondary" icon={<CalendarClock size={16} />} onClick={() => setShowRdvModal(true)}>Prendre RDV</Button>
          </div>
        }
      />

      {showShare && (
        <Card className="mb-4 max-w-lg">
          <CardBody className="flex items-center gap-3 flex-wrap">
            <Select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} className="w-auto min-w-[220px]">
              <option value="">Choisir un technicien</option>
              {techniciens.filter(t => t.idTechnicien !== user?.idTechnicien).map(t => (
                <option key={t.idTechnicien} value={t.idTechnicien}>{t.prenomTechnicien} {t.nomTechnicien}</option>
              ))}
            </Select>
            <Button variant="success" onClick={partagerTicket} disabled={!selectedTech}>Partager</Button>
          </CardBody>
        </Card>
      )}
      {shareMsg && <p className="text-sm text-emerald-600 font-medium mb-4">{shareMsg}</p>}

      {/* Modale RDV */}
      {showRdvModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/30 p-4">
          <div className="relative w-full max-w-2xl min-h-[520px]">
            <WidgetRdv
              onClose={() => setShowRdvModal(false)}
              idTicket={ticket.idTicket}
              idUtilisateur={ticket.idUtilisateur}
              idTechnicien={user.idTechnicien || user.id}
            />
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 flex flex-col gap-4">
          {ticket.isShared || ticket.partagePar ? (
            <SharedTicketCard ticket={ticket} />
          ) : (
            <>
              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Détail du ticket</h3></CardHeader>
                <CardBody className="flex flex-col gap-1.5 text-sm">
                  <DetailRow label="ID" value={`#${ticket.idTicket}`} />
                  <DetailRow label="Titre" value={ticket.titre} />
                  <DetailRow label="Statut" value={ticket.statut} />
                  <DetailRow label="Priorité" value={ticket.priorite} />
                </CardBody>
              </Card>

              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Description du problème</h3></CardHeader>
                <CardBody>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Étapes pour reproduire</h3></CardHeader>
                <CardBody>
                  <p className="text-sm text-slate-700">{ticket.etapes && ticket.etapes.length > 0 ? ticket.etapes.join(', ') : '—'}</p>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="flex flex-col gap-1.5 text-sm">
                  <DetailRow label="Catégorie" value={ticket.categorie} />
                  <DetailRow label="Sous-catégorie" value={ticket.sousCategorie || '—'} />
                  <DetailRow label="Auteur" value={ticket.auteur || '—'} />
                </CardBody>
              </Card>

              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Assigné à</h3></CardHeader>
                <CardBody className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0">
                    {assignedInitials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{assignedUser}</p>
                    <p className="text-xs text-slate-500">Technicien</p>
                  </div>
                </CardBody>
              </Card>

              {/* Pièces jointes du ticket (lors de la création) */}
              {fichiersTicket.length > 0 && (
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-900">Pièce(s) jointe(s) lors de la création</h3></CardHeader>
                  <CardBody>
                    <ul className="flex flex-col gap-2">
                      {fichiersTicket.map((f, i) => {
                        const ext = f.split('.').pop()?.toLowerCase();
                        const isImage = ['png','jpg','jpeg','gif','webp'].includes(ext || '');
                        return (
                          <li key={i}>
                            {isImage ? (
                              <a href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} target="_blank" rel="noopener noreferrer" className="inline-block border border-slate-200 rounded-md overflow-hidden bg-white">
                                <img src={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} alt={f.split('/').pop()} className="max-w-[180px] max-h-[120px] block" />
                              </a>
                            ) : (
                              <a href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
                                {f.split('/').pop()}
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </CardBody>
                </Card>
              )}

              {/* Fallback pour l'ancien système de pièce jointe unique */}
              {!fichiersTicket.length && ticket.pieceJointe && (
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-900">Pièce jointe</h3></CardHeader>
                  <CardBody>
                    <ul className="flex flex-col gap-2">
                      {(Array.isArray(ticket.pieceJointe) ? ticket.pieceJointe : String(ticket.pieceJointe).split(',')).filter((f: any) => f).map((f: string, i: React.Key | null | undefined) => {
                        const ext = f.split('.').pop()?.toLowerCase();
                        const isImage = ['png','jpg','jpeg','gif','webp'].includes(ext || '');
                        return (
                          <li key={i}>
                            {isImage ? (
                              <a href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} target="_blank" rel="noopener noreferrer" className="inline-block border border-slate-200 rounded-md overflow-hidden bg-white">
                                <img src={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} alt={f.split('/').pop()} className="max-w-[180px] max-h-[120px] block" />
                              </a>
                            ) : (
                              <a href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
                                {f.split('/').pop()}
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </CardBody>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Zone de discussion */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col">
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Discussion du ticket</h3>
              <span className="text-xs text-slate-500">{messages.length} messages</span>
            </CardHeader>
            <div ref={chatMessagesRef} className="px-5 py-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">Aucun message pour ce ticket.</p>
              )}
              {messages.map((msg, idx) => {
                const isMine = msg.idExpediteur === (user.idDirecteur ?? user.idTechnicien ?? user.id);
                const listeFichiers = Array.isArray(msg.fichiersJoints) && msg.fichiersJoints.length > 0 ? msg.fichiersJoints : (msg.fichierJoint ? [msg.fichierJoint] : []);
                return (
                  <div
                    key={idx}
                    className={`w-full flex items-end gap-2 ${isMine ? 'flex-row-reverse justify-start' : 'flex-row justify-start'}`}
                  >
                    <Avatar
                      photoUrl={msg.photoprofil || msg.avatar}
                      nom={msg.nom || msg.nomExpediteur || msg.nomUtilisateur}
                      prenom={msg.prenom || msg.prenomExpediteur}
                      size={36}
                    />
                    <div className={`rounded-lg px-3.5 py-2.5 max-w-[70%] ${isMine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                      <div className={`text-xs font-semibold mb-0.5 ${isMine ? 'text-brand-100' : 'text-slate-500'}`}>
                        {msg.prenom || msg.prenomExpediteur || ''} {msg.nom || msg.nomExpediteur || msg.nomUtilisateur || 'Utilisateur inconnu'}
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">{msg.message}</div>
                      {listeFichiers.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {listeFichiers.map((f: string, i: number) => {
                            const ext = f.split('.').pop()?.toLowerCase();
                            const isImage = ['png','jpg','jpeg','gif','webp'].includes(ext || '');
                            const chemin = `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`;
                            return isImage ? (
                              <img
                                key={i}
                                src={chemin}
                                alt="fichier joint"
                                className="max-w-[180px] max-h-[120px] rounded-md cursor-pointer block"
                                onClick={() => {
                                  setLightboxImg(chemin);
                                  setLightboxOpen(true);
                                }}
                              />
                            ) : (
                              <div key={i}>
                                <a href={chemin} target="_blank" rel="noopener noreferrer" className={`underline text-sm ${isMine ? 'text-brand-100' : 'text-brand-600'}`}>
                                  {f.split('/').pop()}
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className={`text-xs mt-2 ${isMine ? 'text-brand-100/80' : 'text-slate-400'}`}>
                        {new Date(msg.dateEnvoi).toLocaleString('fr-FR', {
                          hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit',
                          timeZone: 'Europe/Paris'
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Zone de saisie */}
            <div className="border-t border-slate-200 p-4">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-brand-600 flex items-center justify-center shrink-0"
                  title="Joindre un fichier"
                >
                  <Plus size={18} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.csv"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="relative flex-1">
                  <Textarea
                    placeholder="Tapez votre message... (Maj+Entrée pour nouvelle ligne)"
                    rows={2}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gererEnvoiMessage(); } }}
                    className="pr-16"
                  />
                  <span
                    className={`absolute bottom-2 right-2.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-white border ${
                      message.length > 500 ? 'text-red-500 border-red-200' : message.length > 400 ? 'text-amber-500 border-amber-200' : 'text-slate-400 border-slate-200'
                    }`}
                  >
                    {message.length}/550
                  </span>
                </div>
                <Button variant="primary" icon={<Send size={16} />} onClick={gererEnvoiMessage}>Envoyer</Button>
              </div>
              {file && (
                <div className="text-brand-600 text-xs mt-2 flex items-center gap-1.5"><Paperclip size={13} /> {file.name}</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {lightboxOpen && lightboxImg && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 cursor-zoom-out"
        >
          <img
            src={lightboxImg}
            alt="Agrandissement"
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-lg bg-white p-2"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="fixed top-8 right-10 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center"
            aria-label="Fermer la lightbox"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Modal de clôture de ticket */}
      {showClotureModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Lock size={18} /> Clôturer le ticket #{ticket?.idTicket}
              </h2>
              <button
                onClick={() => {
                  setShowClotureModal(false);
                  setRapport('');
                  setIncludeRapport(false);
                  setStatutCloture('resolu');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Statut de clôture</h3>
              <div className="flex gap-3">
                <label
                  className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-md border text-sm font-medium ${
                    statutCloture === 'resolu' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="statutCloture"
                    value="resolu"
                    checked={statutCloture === 'resolu'}
                    onChange={(e) => setStatutCloture(e.target.value as 'resolu' | 'ferme')}
                    className="hidden"
                  />
                  <CheckCircle2 size={14} /> Résolu
                </label>
                <label
                  className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-md border text-sm font-medium ${
                    statutCloture === 'ferme' ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="statutCloture"
                    value="ferme"
                    checked={statutCloture === 'ferme'}
                    onChange={(e) => setStatutCloture(e.target.value as 'resolu' | 'ferme')}
                    className="hidden"
                  />
                  <XCircle size={14} /> Fermé
                </label>
              </div>
            </div>

            <div className="mb-5">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={includeRapport}
                  onChange={(e) => setIncludeRapport(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-slate-700">Inclure un rapport de clôture</span>
              </label>

              {includeRapport && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rapport de clôture :</label>
                  <Textarea
                    value={rapport}
                    onChange={(e) => setRapport(e.target.value)}
                    placeholder="Décrivez les actions effectuées, la solution apportée, et tout autre détail pertinent..."
                    rows={5}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowClotureModal(false);
                  setRapport('');
                  setIncludeRapport(false);
                  setStatutCloture('resolu');
                }}
              >
                Annuler
              </Button>
              <Button variant="primary" onClick={cloturerTicketAvecRapport} loading={clotureLoading}>
                {clotureLoading ? 'Clôture en cours...' : 'Clôturer le ticket'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label} :</span>
      <span className="text-slate-900 font-medium text-right">{value}</span>
    </div>
  );
}
