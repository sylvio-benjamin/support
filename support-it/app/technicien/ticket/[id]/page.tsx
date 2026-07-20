'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import WidgetRdv from '../../widget-rdv';
import Avatar from '../../../../components/Avatar';
import DashboardLayout from '../../../../components/ui/DashboardLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { Select, Textarea } from '../../../../components/ui/Input';
import Badge, { PrioriteBadge, StatutBadge } from '../../../../components/ui/Badge';
import { Mail, Send, Paperclip, ArrowLeft, Share2, CalendarPlus, CheckCircle2, User as UserIcon } from 'lucide-react';

function SharedTicketCard({ ticket }: { ticket: any }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-3">
          <Badge tone="info">Partagé</Badge>
        </div>
        <h2 className="text-base font-semibold text-slate-900 mb-2">{ticket.titre}</h2>
        <div className="text-sm text-slate-600 mb-3 max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words">{ticket.description}</div>
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="text-sm font-semibold text-brand-700">#{ticket.idTicket}</span>
          <StatutBadge statut={ticket.statut} />
          {ticket.priorite === 'urgent' && <PrioriteBadge priorite="urgente" />}
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
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fichiersTicket, setFichiersTicket] = useState<string[]>([]);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRdvModal, setShowRdvModal] = useState(false);

  // États pour la lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // États pour la clôture de ticket
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [rapport, setRapport] = useState('');
  const [includeRapport, setIncludeRapport] = useState(false);
  const [clotureLoading, setClotureLoading] = useState(false);
  const [statutCloture, setStatutCloture] = useState<'resolu' | 'ferme'>('resolu');

  // Fonction pour charger les fichiers du ticket
  const chargerFichiersTicket = async (idTicket: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php?idTicket=${idTicket}`, {
        credentials: 'include',
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
    if (!id) {
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php?idTicket=${id}`, { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 403) {
          // Erreur d'accès non autorisé
          throw new Error('ACCES_NON_AUTORISE');
        }
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        // Lire le texte brut de la réponse pour debug
        const responseText = await res.text();

        // Essayer de parser le JSON
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          throw new Error('Réponse API invalide');
        }
      })
      .then(async (data) => {
        if (data && data.success && data.tickets && data.tickets.length > 0) {
          const ticketData = data.tickets[0];

          // Vérification de sécurité : s'assurer que le technicien connecté a accès à ce ticket
          // (soit directement assigné, soit via ses services)
          const userData = localStorage.getItem('user');
          if (userData) {
            const currentUser = JSON.parse(userData);

            // Si le ticket n'est pas directement assigné au technicien connecté
            // ET que le ticket a un service assigné, on laisse le backend vérifier l'accès via les services
            if (ticketData.idTechnicien !== currentUser.id && ticketData.serviceConcerne) {
              // Le backend vérifiera l'accès via les services, on ne bloque pas ici
            } else if (ticketData.idTechnicien !== currentUser.id && !ticketData.serviceConcerne) {
              // Ticket sans service et non assigné - on laisse quand même le backend décider
            }
          }

          setTicket(ticketData);
          // Charger les fichiers du ticket
          await chargerFichiersTicket(id as string);
        } else {
          throw new Error('Ticket non trouvé');
        }
      })
      .catch((error) => {
        console.error('Erreur lors du chargement du ticket:', error);

        if (error.message === 'ACCES_NON_AUTORISE') {
          alert("Vous n'êtes pas autorisé à accéder à ce ticket. Il ne vous est pas assigné.");
        } else {
          alert('Erreur lors du chargement du ticket.');
        }

        router.push('/technicien/tickets');
      });

    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTechnicien.php`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.techniciens) setTechniciens(data.techniciens);
      });
  }, [id]);

  useEffect(() => {
    if (!id || !socketRef.current) return;
    const handler = (ticketsMaj: any) => {
      // ticketsMaj peut être un tableau de tickets
      if (Array.isArray(ticketsMaj)) {
        const t = ticketsMaj.find((tk) => String(tk.idTicket) === String(id));
        if (t) {
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
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          idTicket: id,
        }),
      });
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
          idTicket: id,
        }),
      });
      const data = await response.json();
      if (!data.success) {
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
          isActive: isActive,
        }),
      });
    } catch (error) {
      console.error("Erreur lors du marquage d'activité:", error);
    }
  };

  // Gestion du chat temps réel
  useEffect(() => {
    if (!id || !user || !socketRef.current) return;

    // Charger l'historique
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getChatMessages.php?idTicket=${id}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          console.error('Erreur récupération messages:', data.erreur || 'Format invalide');
          setMessages([]);
        }
      })
      .catch((err) => {
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
      setMessages((prev) => [...prev, msg]);

      // Si le message ne vient pas de moi, marquer automatiquement comme lu
      if (msg.idExpediteur !== (user.idTechnicien ?? user.id)) {
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
            isActive: false,
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
          isActive: false,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  if (!ticket) {
    return (
      <DashboardLayout role="technicien">
        <p className="text-slate-500 text-sm">Chargement...</p>
      </DashboardLayout>
    );
  }
  if (!user) {
    return (
      <DashboardLayout role="technicien">
        <p className="text-slate-500 text-sm">Chargement utilisateur...</p>
      </DashboardLayout>
    );
  }

  // Pour l'affichage du nom assigné
  const assignedUser = ticket.nomTechnicien || ticket.nomAssignee || ticket.assignee?.nom || '—';

  // Fonction de partage
  const partagerTicket = () => {
    if (!selectedTech) return;

    const tech = techniciens.find((t) => t.idTechnicien == selectedTech);
    if (!tech) return;
    setShareMsg(`Ticket partagé avec `);

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/PartageUnTicket.php`, {
      method: 'POST',
      body: JSON.stringify({
        idTechnicien: selectedTech,
        idTicket: ticket.idTicket,
      }),
    })
      .then(async (response) => {
        const text = await response.text();
        try {
          JSON.parse(text);
        } catch (err) {
          console.error('Réponse non-JSON ou vide :', text);
        }
      })
      .catch((error) => {
        console.error('Erreur réseau :', error);
      });
  };

  // Nouvelle fonction d'envoi de message avec pièces jointes multiples
  const gererEnvoiMessage = async () => {
    if (!message.trim() && !file && (!files || files.length === 0)) return;
    try {
      const idExpediteur = user.idTechnicien ?? user.id;
      let fichierJoint: string | null = null;
      let fichiersJoints: string[] = [];

      // Gestion des fichiers multiples
      if (files && files.length > 0) {
        const formData = new FormData();
        files.forEach((f, i) => formData.append('piecesJointes_' + i, f));
        formData.append('idTicket', ticket.idTicket);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploadChatFile.php`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.cheminsFichiers) {
          fichiersJoints = data.cheminsFichiers;
        } else {
          alert('Erreur upload fichier : ' + (data.error || 'inconnue'));
        }
      }
      // Gestion du fichier unique (fallback)
      else if (file) {
        const formData = new FormData();
        formData.append('pieceJointe', file);
        formData.append('idTicket', ticket.idTicket);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploadChatFile.php`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.cheminFichier) {
          fichierJoint = data.cheminFichier;
        } else {
          alert('Erreur upload fichier : ' + (data.error || 'inconnue'));
        }
      }

      const nouveauMessage = {
        idTicket: ticket.idTicket,
        idExpediteur,
        nom: user.nom,
        prenom: user.prenom,
        avatar: user.avatar || null,
        message: message.trim(),
        dateEnvoi: new Date().toISOString(),
        fichierJoint,
        fichiersJoints: fichiersJoints.length > 0 ? fichiersJoints : undefined,
      };
      socketRef.current.emit('message', nouveauMessage);
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/saveChatMessage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(nouveauMessage),
      });
      setMessage('');
      setFile(null);
      setFiles([]);

      // Auto-scroll vers le bas du chat après envoi
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 100);
    } catch (erreur) {
      console.error('Erreur envoi message:', erreur);
      setMessage(message);
    }
  };

  const cloturerTicket = async () => {
    setShowClotureModal(true);
    setStatutCloture('resolu');
  };

  const cloturerTicketAvecRapport = async () => {
    setClotureLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fermerTicket.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          idTicket: ticket.idTicket,
          reponse: statutCloture,
          rapport: includeRapport ? rapport : null,
        }),
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
      window.location.href = '/technicien/mes-tickets';
    } catch (erreur) {
      console.error('Erreur fermeture ticket:', erreur);
      alert('Erreur lors de la clôture du ticket');
    } finally {
      setClotureLoading(false);
    }
  };

  const notifierParMail = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notificationParEmailUtilisateur.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          idTicket: ticket.idTicket,
          idUtilisateur: ticket.idUtilisateur,
        }),
      });

      if (response.ok) {
        alert('Notification par mail envoyée avec succès !');
      } else {
        alert("Erreur lors de l'envoi de la notification par mail");
      }
    } catch (erreur) {
      console.error('Erreur notification par mail:', erreur);
      alert("Erreur lors de l'envoi de la notification par mail");
    }
  };

  const piecesTicket: string[] = ticket.pieceJointe
    ? (Array.isArray(ticket.pieceJointe) ? ticket.pieceJointe : String(ticket.pieceJointe).split(',')).filter((f: string) => f)
    : [];

  return (
    <DashboardLayout role="technicien">
      <PageHeader
        title={`Ticket #${ticket.idTicket} — ${ticket.titre}`}
        description={undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatutBadge statut={ticket.statut} />
            <PrioriteBadge priorite={ticket.priorite} />
            <Button
              variant="secondary"
              icon={<ArrowLeft size={16} />}
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/technicien/tickets');
                }
              }}
            >
              Retour
            </Button>
            <Button variant="secondary" icon={<Share2 size={16} />} onClick={() => setShowShare((v) => !v)}>
              Partager
            </Button>
            <Button variant="secondary" icon={<Mail size={16} />} onClick={notifierParMail}>
              Notifier par mail
            </Button>
            <Button variant="secondary" icon={<CalendarPlus size={16} />} onClick={() => setShowRdvModal(true)}>
              Prendre RDV
            </Button>
            <Button variant="danger" icon={<CheckCircle2 size={16} />} onClick={cloturerTicket}>
              Fermer le ticket
            </Button>
          </div>
        }
      />

      {showShare && (
        <Card className="mb-4 max-w-md">
          <CardBody className="flex flex-col gap-3">
            <Select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)}>
              <option value="">Choisir un technicien</option>
              {techniciens
                .filter((t) => t.idTechnicien !== user?.idTechnicien)
                .map((t) => (
                  <option key={t.idTechnicien} value={t.idTechnicien}>
                    {t.prenomTechnicien} {t.nomTechnicien}
                  </option>
                ))}
            </Select>
            <Button variant="success" size="sm" disabled={!selectedTech} onClick={partagerTicket} className="self-start">
              Partager
            </Button>
            {shareMsg && <p className="text-sm text-emerald-600 font-medium">{shareMsg}</p>}
          </CardBody>
        </Card>
      )}

      {/* Modale RDV */}
      {showRdvModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/40 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl min-h-[520px]">
            <WidgetRdv onClose={() => setShowRdvModal(false)} idTicket={ticket.idTicket} idUtilisateur={ticket.idUtilisateur} idTechnicien={user.idTechnicien || user.id} />
          </div>
        </div>
      )}

      {/* Modale de clôture de ticket */}
      {showClotureModal && (
        <div
          className="fixed inset-0 z-[1000] bg-slate-900/40 flex items-center justify-center p-4"
          onClick={() => !clotureLoading && setShowClotureModal(false)}
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 mb-5 text-center">Clôturer le ticket #{ticket.idTicket}</h2>

            <div className="flex flex-col gap-5">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Statut de clôture</label>
                <div className="flex gap-3">
                  <label
                    className={`flex items-center gap-2 px-4 py-3 rounded-md border cursor-pointer flex-1 ${
                      statutCloture === 'resolu' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statutCloture"
                      value="resolu"
                      checked={statutCloture === 'resolu'}
                      onChange={(e) => setStatutCloture(e.target.value as 'resolu' | 'ferme')}
                    />
                    <span className={`text-sm font-medium ${statutCloture === 'resolu' ? 'text-emerald-700' : 'text-slate-600'}`}>Résolu</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 px-4 py-3 rounded-md border cursor-pointer flex-1 ${
                      statutCloture === 'ferme' ? 'border-red-500 bg-red-50' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statutCloture"
                      value="ferme"
                      checked={statutCloture === 'ferme'}
                      onChange={(e) => setStatutCloture(e.target.value as 'resolu' | 'ferme')}
                    />
                    <span className={`text-sm font-medium ${statutCloture === 'ferme' ? 'text-red-700' : 'text-slate-600'}`}>Fermé</span>
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-2 italic">
                  <strong>Résolu</strong> : le problème a été résolu avec succès.
                  <br />
                  <strong>Fermé</strong> : le ticket est fermé sans résolution complète.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={includeRapport} onChange={(e) => setIncludeRapport(e.target.checked)} />
                Ajouter un rapport de clôture (optionnel)
              </label>

              {includeRapport && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Rapport de clôture</label>
                  <Textarea
                    value={rapport}
                    onChange={(e) => setRapport(e.target.value)}
                    placeholder="Décrivez les actions effectuées, la solution apportée, et tout autre élément pertinent pour la clôture de ce ticket..."
                    rows={5}
                  />
                  <p className="text-xs text-slate-500 mt-1 italic">
                    Ce rapport sera visible par le directeur et pourra être utilisé pour les statistiques.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="secondary"
                disabled={clotureLoading}
                onClick={() => {
                  setShowClotureModal(false);
                  setRapport('');
                  setIncludeRapport(false);
                  setStatutCloture('resolu');
                }}
              >
                Annuler
              </Button>
              <Button variant="success" loading={clotureLoading} onClick={cloturerTicketAvecRapport}>
                Clôturer le ticket
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contenu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 flex flex-col gap-4">
          {ticket.isShared || ticket.partagePar ? (
            <SharedTicketCard ticket={ticket} />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Détail du ticket</h3>
                </CardHeader>
                <CardBody>
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">ID</dt>
                      <dd className="text-slate-900">#{ticket.idTicket}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Titre</dt>
                      <dd className="text-slate-900 text-right">{ticket.titre}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Statut</dt>
                      <dd className="text-slate-900">{ticket.statut}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Priorité</dt>
                      <dd className="text-slate-900">{ticket.priorite}</dd>
                    </div>
                  </dl>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Description du problème</h3>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{ticket.description}</p>
                </CardBody>
              </Card>

              {fichiersTicket.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="text-sm font-semibold text-slate-900">Pièce(s) jointe(s) lors de la création</h3>
                  </CardHeader>
                  <CardBody>
                    <ul className="flex flex-col gap-2">
                      {fichiersTicket.map((f, i) => {
                        const ext = f.split('.').pop()?.toLowerCase();
                        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
                        const chemin = `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`;
                        return (
                          <li key={i}>
                            {isImage ? (
                              <a href={chemin} target="_blank" rel="noopener noreferrer" className="inline-block border border-slate-200 rounded overflow-hidden">
                                <img src={chemin} alt={f.split('/').pop()} className="max-w-[180px] max-h-[120px] block" />
                              </a>
                            ) : (
                              <a href={chemin} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-sm">
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

              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Étapes pour reproduire</h3>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-slate-600">{ticket.etapes && ticket.etapes.length > 0 ? ticket.etapes.join(', ') : '—'}</p>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Catégorie</dt>
                      <dd className="text-slate-900">{ticket.categorie}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Sous-catégorie</dt>
                      <dd className="text-slate-900">{ticket.sousCategorie || '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Auteur</dt>
                      <dd className="text-slate-900">{ticket.auteur || '—'}</dd>
                    </div>
                  </dl>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Assigné à</h3>
                </CardHeader>
                <CardBody className="flex items-center gap-3">
                  <Avatar nom={ticket.nomTechnicien} prenom={ticket.prenomTechnicien} size={40} />
                  <div>
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                      <UserIcon size={13} className="text-slate-400" /> {assignedUser}
                    </p>
                    <p className="text-xs text-slate-500">Technicien</p>
                  </div>
                </CardBody>
              </Card>

              {piecesTicket.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="text-sm font-semibold text-slate-900">Pièce(s) jointe(s)</h3>
                  </CardHeader>
                  <CardBody>
                    <ul className="flex flex-col gap-2">
                      {piecesTicket.map((f, i) => {
                        const ext = f.split('.').pop()?.toLowerCase();
                        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
                        const chemin = `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`;
                        return (
                          <li key={i}>
                            {isImage ? (
                              <a href={chemin} target="_blank" rel="noopener noreferrer" className="inline-block border border-slate-200 rounded overflow-hidden">
                                <img src={chemin} alt={f.split('/').pop()} className="max-w-[180px] max-h-[120px] block" />
                              </a>
                            ) : (
                              <a href={chemin} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-sm">
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

        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Discussion du ticket</h3>
            <span className="text-xs text-slate-500">{messages.length} messages</span>
          </CardHeader>
          <CardBody className="max-h-[60vh] overflow-y-auto">
          <div ref={chatMessagesRef} className="flex flex-col gap-3">
            {messages.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Aucun message pour ce ticket.</p>}

            {messages.map((msg, idx) => {
              const isMine = msg.idExpediteur === (user.idTechnicien ?? user.id);
              const listeFichiers: string[] =
                Array.isArray(msg.fichiersJoints) && msg.fichiersJoints.length > 0
                  ? msg.fichiersJoints
                  : msg.fichierJoint
                  ? [msg.fichierJoint]
                  : [];

              return (
                <div key={idx} className={`w-full flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Avatar
                    photoUrl={msg.photoprofil || msg.avatar}
                    nom={msg.nom || msg.nomExpediteur || msg.nomUtilisateur}
                    prenom={msg.prenom || msg.prenomExpediteur}
                    size={32}
                  />
                  <div className={`max-w-[70%] rounded-lg px-3 py-2.5 ${isMine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                    <p className={`text-xs font-semibold mb-1 ${isMine ? 'text-brand-50 text-right' : 'text-slate-500'}`}>
                      {msg.prenom || msg.prenomExpediteur || ''} {msg.nom || msg.nomExpediteur || msg.nomUtilisateur || 'Utilisateur inconnu'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    {listeFichiers.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {listeFichiers.map((f: string, i: number) => {
                          const ext = f.split('.').pop()?.toLowerCase();
                          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
                          const chemin = `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`;
                          return isImage ? (
                            <img
                              key={i}
                              src={chemin}
                              alt="fichier joint"
                              className="max-w-[180px] max-h-[120px] rounded cursor-pointer block"
                              onClick={() => {
                                setLightboxImg(chemin);
                                setLightboxOpen(true);
                              }}
                            />
                          ) : (
                            <a
                              key={i}
                              href={chemin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 text-xs underline ${isMine ? 'text-brand-50' : 'text-brand-600'}`}
                            >
                              <Paperclip size={11} /> {f.split('/').pop()}
                            </a>
                          );
                        })}
                      </div>
                    )}
                    <p className={`text-[11px] mt-1.5 ${isMine ? 'text-brand-100' : 'text-slate-400'}`}>
                      {new Date(msg.dateEnvoi).toLocaleString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        timeZone: 'Europe/Paris',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          </CardBody>

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-brand-600 shrink-0 text-lg font-medium"
                title="Joindre un fichier"
              >
                +
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.csv"
                onChange={(e) => {
                  const fl = Array.from(e.target.files || []);
                  setFiles(fl);
                  setFile(fl[0] || null);
                }}
                className="hidden"
              />
              <div className="relative flex-1">
                <Textarea
                  placeholder="Tapez votre message... (Maj+Entrée pour nouvelle ligne)"
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      gererEnvoiMessage();
                    }
                  }}
                  maxLength={550}
                />
                <span
                  className={`absolute bottom-1.5 right-2 text-[11px] font-medium px-1.5 py-0.5 rounded bg-white/90 border ${
                    message.length > 500 ? 'text-red-600 border-red-200' : message.length > 400 ? 'text-amber-600 border-amber-200' : 'text-slate-400 border-slate-200'
                  }`}
                >
                  {message.length}/550
                </span>
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <Button variant="primary" icon={<Send size={15} />} onClick={gererEnvoiMessage} className="shrink-0">
                Envoyer
              </Button>
            </div>
            {files && files.length > 0 && (
              <div className="text-xs text-brand-600 mt-2 flex flex-col gap-0.5">
                {files.map((f, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    <Paperclip size={11} /> {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {lightboxOpen && lightboxImg && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[2000] bg-slate-900/70 flex items-center justify-center cursor-zoom-out"
        >
          <img src={lightboxImg} alt="Agrandissement" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-lg bg-white p-2" onClick={(e) => e.stopPropagation()} />
          <button
            onClick={() => setLightboxOpen(false)}
            className="fixed top-8 right-10 bg-slate-900/60 text-white rounded-full w-10 h-10 text-2xl flex items-center justify-center"
            aria-label="Fermer la lightbox"
          >
            ×
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
