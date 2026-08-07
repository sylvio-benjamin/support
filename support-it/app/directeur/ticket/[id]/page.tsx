'use client';

import React, { useEffect, useState, useRef } from 'react';

import { useRouter, useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import WidgetRdv from '../../widgetrdv';
import Avatar from '../../../../components/Avatar';
import { Send, Paperclip, Lock, CheckCircle2, XCircle, X, Plus, Share2, CalendarClock, ArrowLeft, UserPlus, UserCheck, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '../../../../components/ui/DashboardLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card';
import { Select, Textarea } from '../../../../components/ui/Input';
import Button from '../../../../components/ui/Button';
import { StatutBadge, PrioriteBadge } from '../../../../components/ui/Badge';
import { declencherRafraichissementNotifications } from '../../../../lib/notificationEvents';
import { obtenirEnTeteCsrf } from '../../../../lib/csrf';


export default function TicketDetailTechnicien() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [showShare, setShowShare] = useState(false);
  const [selectedTech, setSelectedTech] = useState('');
  const [shareMsg, setShareMsg] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [selectedAssignTech, setSelectedAssignTech] = useState('');
  const [assignMsg, setAssignMsg] = useState('');
  const [techniciens, setTechniciens] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [estEnvoiMessage, setEstEnvoiMessage] = useState(false);
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
  const [messageEnEditionId, setMessageEnEditionId] = useState<number | null>(null);
  const [texteEdition, setTexteEdition] = useState('');
  const [sauvegardeEditionEnCours, setSauvegardeEditionEnCours] = useState(false);
  const [membres, setMembres] = useState<any[]>([]);
  const [collegues, setCollegues] = useState<any[]>([]);
  const [idCollegueSelectionne, setIdCollegueSelectionne] = useState('');
  const [ajoutMembreEnCours, setAjoutMembreEnCours] = useState(false);

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

// Ouvrir ce ticket marque comme lues les notifications qui le concernent :
// le badge "Tickets" de la sidebar doit disparaître dès qu'on ouvre le
// ticket en question, pas seulement en cliquant la notification elle-même.
useEffect(() => {
  if (!id) return;
  fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/markTicketNotificationsRead.php`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idTicket: id }),
  })
    .then((r) => r.json())
    .then((d) => {
      if (d.succes) declencherRafraichissementNotifications();
    })
    .catch(() => {});
}, [id]);

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

  // Membres ajoutés au ticket (collègues de l'entreprise cliente, cf. membresTicket.php)
  const chargerMembres = async () => {
    if (!id) return;
    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/membresTicket.php?idTicket=${id}`, { credentials: 'include' });
      const donnees = await reponse.json();
      setMembres(donnees?.success ? donnees.membres : []);
    } catch (e) {
      setMembres([]);
    }
  };

  useEffect(() => {
    chargerMembres();
  }, [id]);

  // Un directeur plateforme peut gérer les membres de n'importe quel ticket,
  // quelle que soit l'entreprise (cf. estDirecteurPlateforme() dans
  // membresTicket.php) — on charge donc les collègues de l'entreprise DU
  // TICKET (pas celle du directeur, qui n'en a pas), via l'endpoint qui
  // accepte un idEntreprise explicite.
  useEffect(() => {
    if (!ticket?.idEntreprise) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateursParEntreprise.php?idEntreprise=${ticket.idEntreprise}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setCollegues(d?.success ? d.utilisateurs : []))
      .catch(() => setCollegues([]));
  }, [ticket?.idEntreprise]);

  const ajouterMembre = async () => {
    if (!idCollegueSelectionne) return;
    setAjoutMembreEnCours(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/membresTicket.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idTicket: ticket.idTicket, idUtilisateur: Number(idCollegueSelectionne) }),
      });
      const data = await res.json();
      if (data.success) {
        setIdCollegueSelectionne('');
        await chargerMembres();
      } else {
        alert(data.error || "Erreur lors de l'ajout");
      }
    } catch (e) {
      alert('Erreur réseau');
    }
    setAjoutMembreEnCours(false);
  };

  const retirerMembre = async (idUtilisateurCible: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/membresTicket.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idTicket: ticket.idTicket, idUtilisateur: idUtilisateurCible, action: 'retirer' }),
      });
      const data = await res.json();
      if (data.success) await chargerMembres();
    } catch (e) {
      // silencieux
    }
  };

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

  // Édition d'un message déjà envoyé : seul l'auteur peut modifier (vérifié
  // aussi côté serveur dans modifierMessage.php).
  const demarrerEdition = (msg: any) => {
    setMessageEnEditionId(msg.idMessage);
    setTexteEdition(msg.message);
  };

  const annulerEdition = () => {
    setMessageEnEditionId(null);
    setTexteEdition('');
  };

  const sauvegarderEdition = async () => {
    if (!texteEdition.trim() || messageEnEditionId == null) return;
    setSauvegardeEditionEnCours(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/modifierMessage.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idMessage: messageEnEditionId, message: texteEdition.trim() }),
      });
      const data = await res.json();
      if (data.succes) {
        const { idMessage, message: texteMaj, dateModification } = data.messageData;
        setMessages((precedents: any[]) =>
          precedents.map((m) => (m.idMessage === idMessage ? { ...m, message: texteMaj, dateModification } : m))
        );
        socketRef.current?.emit('messageModifie', { idTicket: ticket.idTicket, idMessage, message: texteMaj, dateModification });
        annulerEdition();
      } else {
        alert(data.erreur || 'Erreur lors de la modification');
      }
    } catch (e) {
      alert('Erreur réseau');
    }
    setSauvegardeEditionEnCours(false);
  };

  // Suppression "pour tout le monde" : seul l'auteur peut supprimer (vérifié
  // aussi côté serveur dans supprimerMessage.php).
  const supprimerMessageChat = async (msg: any) => {
    if (!window.confirm('Supprimer ce message pour tout le monde ? Cette action est irréversible.')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/supprimerMessage.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...obtenirEnTeteCsrf() },
        body: JSON.stringify({ idMessage: msg.idMessage }),
      });
      const data = await res.json();
      if (data.succes) {
        setMessages((precedents: any[]) =>
          precedents.map((m) => (m.idMessage === msg.idMessage ? { ...m, estSupprime: true, message: '', fichiersJoints: [], fichierJoint: null } : m))
        );
        socketRef.current?.emit('messageSupprime', { idTicket: ticket.idTicket, idMessage: msg.idMessage });
        if (messageEnEditionId === msg.idMessage) annulerEdition();
      } else {
        alert(data.erreur || 'Erreur lors de la suppression');
      }
    } catch (e) {
      alert('Erreur réseau');
    }
  };

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
        // Le badge "messages non lus" des listes de tickets dépend de CETTE
        // écriture précisément (table messagesLus), pas de
        // markTicketNotificationsRead.php (table notifications, appelée en
        // parallèle) : déclencher l'événement ici évite une course où la
        // liste se rafraîchit avant que ce marquage-ci soit terminé.
        declencherRafraichissementNotifications();
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
        // Comparaison sans dateEnvoi (chaîne exacte) : un message rechargé
        // depuis la base (format MySQL) et le même message reçu via l'écho
        // socket (format ISO du navigateur) ne partagent jamais exactement
        // la même chaîne de date, même quand c'est littéralement le même
        // message — ce qui laissait passer un doublon malgré ce garde-fou.
        // On se limite aux derniers messages (pas tout l'historique) pour ne
        // pas bloquer l'envoi légitime du même texte plus tard dans la conversation.
        const messageExists = prev.slice(-5).some(existingMsg =>
          existingMsg.message === msg.message &&
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

    const handlerMessageModifie = (donnees: any) => {
      setMessages((precedents: any[]) =>
        precedents.map((m) =>
          m.idMessage === donnees.idMessage
            ? { ...m, message: donnees.message, dateModification: donnees.dateModification }
            : m
        )
      );
    };
    socketRef.current.on('messageModifie', handlerMessageModifie);

    const handlerMessageSupprime = (donnees: any) => {
      setMessages((precedents: any[]) =>
        precedents.map((m) =>
          m.idMessage === donnees.idMessage ? { ...m, estSupprime: true, message: '', fichiersJoints: [], fichierJoint: null } : m
        )
      );
    };
    socketRef.current.on('messageSupprime', handlerMessageSupprime);

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
      socketRef.current.off('messageModifie', handlerMessageModifie);
      socketRef.current.off('messageSupprime', handlerMessageSupprime);
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
  // Le rôle affiché doit refléter le rôle réel de la personne assignée
  // (un compte "technicien" peut avoir le rôle directeur), pas rester figé
  // sur "Technicien" quel que soit qui est assigné.
  const roleAssigne = ticket.roleTechnicien || ticket.assignee?.role;
  const assignedRoleLabel = roleAssigne === 'directeur' || roleAssigne === 'Directeur' ? 'Directeur' : 'Technicien';

  const partagerTicket = () => {
    if (!selectedTech) return;

    const tech = techniciens.find(t => t.idTechnicien == selectedTech);
    if (!tech) return;

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/PartageUnTicket.php`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idTechnicien: selectedTech,
        idTicket: ticket.idTicket
      })
    })
      .then(async (response) => {
        const data = await response.json();
        if (data.status === 'success') {
          setShareMsg(`Ticket partagé avec ${tech.prenomTechnicien} ${tech.nomTechnicien}`);
          setSelectedTech('');
          setShowShare(false);
        } else {
          setShareMsg(data.message || 'Erreur lors du partage.');
        }
      })
      .catch((error) => {
        console.error("Erreur réseau :", error);
        setShareMsg('Erreur réseau lors du partage.');
      });
  };

  // Assignation ciblée (réservée aux directeurs plateforme côté backend) :
  // contrairement à "Partager", ceci change le technicien PRINCIPAL du
  // ticket (et peut le faire même si déjà assigné à quelqu'un d'autre), et
  // la liste inclut le directeur lui-même (assigner à soi-même doit rester
  // possible via ce même flux).
  const assignerTicketA = async () => {
    if (!selectedAssignTech) return;

    const tech = techniciens.find(t => t.idTechnicien == selectedAssignTech);
    if (!tech) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/assignerTicket.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...obtenirEnTeteCsrf() },
        body: JSON.stringify({
          idTicket: ticket.idTicket,
          idTechnicienCible: selectedAssignTech,
        }),
      });
      const data = await response.json();
      if (data.succes) {
        setAssignMsg(`Ticket assigné à ${tech.prenomTechnicien} ${tech.nomTechnicien}`);
        setSelectedAssignTech('');
        setShowAssign(false);
        // Recharger le ticket pour refléter le nouveau technicien assigné.
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php?idTicket=${ticket.idTicket}`, { credentials: 'include' });
        const d = await r.json();
        if (d?.success && d.tickets?.length > 0) setTicket(d.tickets[0]);
      } else {
        setAssignMsg(data.erreur || "Erreur lors de l'assignation.");
      }
    } catch (error) {
      console.error('Erreur réseau :', error);
      setAssignMsg("Erreur réseau lors de l'assignation.");
    }
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
    // Garde anti-double-envoi : la touche Entrée appelle cette fonction sans
    // passer par l'attribut "disabled" du bouton Envoyer, donc un appui
    // répété rapide (répétition clavier, ou Entrée suivi d'un clic) pouvait
    // déclencher deux envois du même message avant que le premier n'ait eu
    // le temps de vider le champ — d'où le même message (et le même email de
    // notification) envoyé deux fois.
    if (estEnvoiMessage) return;
    if (!message.trim() && !file) return;

    const messageText = message.trim();
    setMessage(''); // Vider le champ immédiatement
    setFile(null); // Vider le fichier immédiatement
    setEstEnvoiMessage(true);

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
        // Cette page est exclusivement utilisée par un directeur plateforme
        // (table "techniciens") : le type est donc toujours connu avec
        // certitude, jamais à deviner côté lecture (cf. getChatMessages.php).
        typeExpediteur: 'technicien',
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

      // Ne pas ajouter le message localement ici : le serveur socket.io
      // relaie ('echo') tout message émis à TOUT le monde dans la room, y
      // compris l'expéditeur — l'ajouter aussi ici créait un doublon visible
      // (le garde-fou plus bas, qui compare dateEnvoi en chaîne exacte, ne
      // rattrapait pas le cas où un rechargement entre-temps réinjectait le
      // même message avec un format de date différent, DB vs client).

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
    } finally {
      setEstEnvoiMessage(false);
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
          'Content-Type': 'application/json',
          ...obtenirEnTeteCsrf()
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
          {ticket.priorite === 'urgente' && <span className="text-xs font-semibold text-red-600">Urgent</span>}
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
            <Button variant="secondary" icon={<UserCheck size={16} />} onClick={() => setShowAssign(v => !v)}>Assigner à...</Button>
            <Button variant="secondary" icon={<Share2 size={16} />} onClick={() => setShowShare(v => !v)}>Partager le ticket</Button>
            <Button variant="secondary" icon={<CalendarClock size={16} />} onClick={() => setShowRdvModal(true)}>Prendre RDV</Button>
          </div>
        }
      />

      {showAssign && (
        <Card className="mb-4 max-w-lg">
          <CardBody className="flex items-center gap-3 flex-wrap">
            <Select value={selectedAssignTech} onChange={e => setSelectedAssignTech(e.target.value)} className="w-auto min-w-[220px]">
              <option value="">Choix technicien (ou vous-même)</option>
              {techniciens.filter(t => t.role !== 'affichage').map(t => {
                const dejaAssigne = ticket.idTechnicien && t.idTechnicien == ticket.idTechnicien;
                const suffixe = dejaAssigne ? ' (déjà assigné)' : (t.idTechnicien === user?.idTechnicien ? ' (vous)' : '');
                return (
                  <option key={t.idTechnicien} value={t.idTechnicien} disabled={!!dejaAssigne}>
                    {t.prenomTechnicien} {t.nomTechnicien}{suffixe}
                  </option>
                );
              })}
            </Select>
            <Button variant="success" onClick={assignerTicketA} disabled={!selectedAssignTech}>Assigner</Button>
          </CardBody>
        </Card>
      )}
      {assignMsg && <p className="text-sm text-emerald-600 font-medium mb-4">{assignMsg}</p>}

      {showShare && (
        <Card className="mb-4 max-w-lg">
          <CardBody className="flex items-center gap-3 flex-wrap">
            <Select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} className="w-auto min-w-[220px]">
              <option value="">Choix technicien</option>
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
                  <DetailRow label="Entreprise" value={ticket.nomEntreprise || '—'} />
                </CardBody>
              </Card>

              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Assigné à</h3></CardHeader>
                <CardBody className="flex items-center gap-3">
                  <Avatar
                    photoUrl={ticket.assignee?.photoprofil}
                    nom={ticket.nomTechnicien || ticket.assignee?.nomSeul}
                    prenom={ticket.prenomTechnicien || ticket.assignee?.prenom}
                    size={40}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{assignedUser}</p>
                    <p className="text-xs text-slate-500">{assignedRoleLabel}</p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-900">Membres du ticket</h3></CardHeader>
                <CardBody className="flex flex-col gap-3 text-sm">
                  {membres.length === 0 ? (
                    <p className="text-slate-500 text-sm">Aucun collègue n&apos;a été ajouté à ce ticket.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {membres.map((m) => (
                        <li key={m.idUtilisateur} className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900">{m.prenomUtilisateur} {m.nomUtilisateur}</span>
                          <button
                            type="button"
                            title="Retirer ce membre"
                            onClick={() => retirerMembre(m.idUtilisateur)}
                            className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <Select
                      value={idCollegueSelectionne}
                      onChange={(e) => setIdCollegueSelectionne(e.target.value)}
                      className="flex-1"
                    >
                      <option value="">Ajouter un collègue...</option>
                      {collegues
                        .filter(
                          (c) =>
                            String(c.idUtilisateur) !== String(ticket.idUtilisateur) &&
                            !membres.some((m) => String(m.idUtilisateur) === String(c.idUtilisateur))
                        )
                        .map((c) => (
                          <option key={c.idUtilisateur} value={c.idUtilisateur}>
                            {c.prenomUtilisateur} {c.nomUtilisateur}
                          </option>
                        ))}
                    </Select>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<UserPlus size={14} />}
                      disabled={!idCollegueSelectionne || ajoutMembreEnCours}
                      onClick={ajouterMembre}
                    >
                      Ajouter
                    </Button>
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
                // Cette page est exclusivement utilisée par un directeur
                // plateforme (table "techniciens") : on vérifie aussi le type
                // quand il est connu, sinon un idUtilisateur identique par
                // coïncidence ferait apparaître le message d'un employé comme le sien.
                const monId = user.idDirecteur ?? user.idTechnicien ?? user.id;
                const isMine = msg.idExpediteur === monId && (msg.typeExpediteur == null || msg.typeExpediteur === 'technicien');
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
                      {msg.estSupprime ? (
                        <p className="text-sm italic opacity-70">Ce message a été supprimé</p>
                      ) : messageEnEditionId === msg.idMessage ? (
                        <div className="flex flex-col gap-2">
                          <Textarea
                            value={texteEdition}
                            onChange={(e) => setTexteEdition(e.target.value)}
                            rows={2}
                            maxLength={550}
                            className="text-sm text-slate-900 bg-white"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="secondary" onClick={annulerEdition} disabled={sauvegardeEditionEnCours}>
                              Annuler
                            </Button>
                            <Button size="sm" variant="primary" onClick={sauvegarderEdition} loading={sauvegardeEditionEnCours} disabled={!texteEdition.trim()}>
                              Enregistrer
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap break-words">{msg.message}</div>
                      )}
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
                      {messageEnEditionId !== msg.idMessage && (
                        <div className={`flex items-center gap-1.5 text-xs mt-2 ${isMine ? 'text-brand-100/80' : 'text-slate-400'}`}>
                          <span>
                            {new Date(msg.dateEnvoi).toLocaleString('fr-FR', {
                              hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
                              timeZone: 'Europe/Paris'
                            })}
                            {msg.dateModification ? ' (modifié)' : ''}
                          </span>
                          {isMine && !msg.estSupprime && (
                            <>
                              <button
                                type="button"
                                title="Modifier ce message"
                                onClick={() => demarrerEdition(msg)}
                                className="text-brand-100/80 hover:text-white"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                title="Supprimer ce message"
                                onClick={() => supprimerMessageChat(msg)}
                                className="text-brand-100/80 hover:text-white"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
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
                <Button variant="primary" icon={<Send size={16} />} onClick={gererEnvoiMessage} loading={estEnvoiMessage} disabled={estEnvoiMessage || !message.trim()}>Envoyer</Button>
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
