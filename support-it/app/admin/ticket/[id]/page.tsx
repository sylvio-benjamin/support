'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import useAuthRedirect from '../../../../hooks/useAuthRedirect';
import Avatar from '../../../../components/Avatar';
import { MessageCircle, Paperclip, Send, Loader2, Plus, X, Info, FileText, Users, UserPlus, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '../../../../components/ui/DashboardLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card';
import { Textarea } from '../../../../components/ui/Input';
import { StatutBadge, PrioriteBadge } from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import { declencherRafraichissementNotifications } from '../../../../lib/notificationEvents';
import { obtenirEnTeteCsrf } from '../../../../lib/csrf';

export default function DetailTicketAdmin() {
  useAuthRedirect();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [estChargement, setEstChargement] = useState(true);
  const [estEnvoiMessage, setEstEnvoiMessage] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  // États pour la lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string|null>(null);
  const [file, setFile] = useState<File|null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [membres, setMembres] = useState<any[]>([]);
  const [collegues, setCollegues] = useState<any[]>([]);
  const [idCollegueSelectionne, setIdCollegueSelectionne] = useState('');
  const [ajoutMembreEnCours, setAjoutMembreEnCours] = useState(false);
  const [messageEnEditionId, setMessageEnEditionId] = useState<number | null>(null);
  const [texteEdition, setTexteEdition] = useState('');
  const [sauvegardeEditionEnCours, setSauvegardeEditionEnCours] = useState(false);

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

  // Configuration Socket.IO
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`);
      socketRef.current.on('connect', () => {
        console.log('[DEBUG] Socket connecté, id:', socketRef.current.id);
      });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Chargement du ticket et de l'utilisateur
  useEffect(() => {
    const chargerDonnees = async () => {
    if (!id) return;

      try {
        const reponseTicket = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php?idTicket=${id}`, {
          credentials: 'include'
        });
        if (reponseTicket.status === 403) {
          // Erreur d'accès non autorisé
          throw new Error('ACCES_NON_AUTORISE');
        }
        if (!reponseTicket.ok) {
          throw new Error(`HTTP error! status: ${reponseTicket.status}`);
        }
        const donneesTicket = await reponseTicket.json();
        if (donneesTicket && donneesTicket.success && donneesTicket.tickets && donneesTicket.tickets.length > 0) {
          const ticketData = donneesTicket.tickets[0];

          // Vérification de sécurité côté client pour les administrateurs référents
          const donneesUtilisateur = localStorage.getItem('user');
          if (donneesUtilisateur) {
            const utilisateurParse = JSON.parse(donneesUtilisateur);
            // Pour admin, on s'assure que le rôle est correct
            if (!utilisateurParse.role) {
              utilisateurParse.role = 'admin';
              localStorage.setItem('user', JSON.stringify(utilisateurParse));
            }

            // Si le ticket n'appartient pas à l'admin connecté ET n'est pas de son entreprise
            if (ticketData.idUtilisateur !== utilisateurParse.id && ticketData.idEntreprise !== utilisateurParse.idEntreprise) {
              console.error('Accès non autorisé : ce ticket ne fait pas partie de votre entreprise');
              alert('Vous n\'êtes pas autorisé à accéder à ce ticket. Il ne fait pas partie de votre entreprise.');
              router.push('/admin/mes-tickets');
              return;
            }

            setUtilisateur(utilisateurParse);
          }

          setTicket(ticketData);
        } else {
          throw new Error('Ticket non trouvé');
        }

        setEstChargement(false);
      } catch (erreur) {
        console.error('Erreur chargement:', erreur);

        if (erreur instanceof Error && erreur.message === 'ACCES_NON_AUTORISE') {
          alert('Vous n\'êtes pas autorisé à accéder à ce ticket. Il ne fait pas partie de votre entreprise.');
        } else {
          alert('Erreur lors du chargement du ticket.');
        }

        router.push('/admin/mes-tickets');
        setEstChargement(false);
      }
    };

    chargerDonnees();
  }, [id]);

  // Chargement des messages
  useEffect(() => {
    if (!id) return;

    const chargerMessages = async () => {
      try {
        const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getChatMessages.php?idTicket=${id}`, {
          credentials: 'include'
        });
        const donnees = await reponse.json();
        if (Array.isArray(donnees)) {
          setMessages(donnees);
        } else {
          console.error('Erreur récupération messages:', donnees.erreur || 'Format invalide');
          setMessages([]);
        }
      } catch (erreur) {
        console.error('Erreur chargement messages:', erreur);
        setMessages([]);
      }
    };

    chargerMessages();
  }, [id]);

  // Membres ajoutés au ticket (collègues de la même entreprise, cf. membresTicket.php)
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

  // Un admin référent peut gérer les membres de n'importe quel ticket de sa
  // propre entreprise (cf. peutGererMembres() dans membresTicket.php), donc
  // on charge toujours la liste des collègues, sans condition de propriété.
  useEffect(() => {
    if (!utilisateur) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateurParEntreprise.php`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setCollegues(d?.success ? d.utilisateurs : []))
      .catch(() => setCollegues([]));
  }, [utilisateur]);

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

  // Fonction pour marquer les notifications du ticket comme lues
  const marquerNotificationsTicketLues = async () => {
    if (!id || !utilisateur?.id) return;

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markTicketNotificationsAsRead',
          idUtilisateur: utilisateur.id,
          idTicket: id
        })
      });
      console.log('Notifications du ticket marquées comme lues (admin)');
    } catch (error) {
      console.error('Erreur lors du marquage des notifications:', error);
    }
  };

  // Fonction pour marquer les messages du ticket comme lus
  const marquerMessagesTicketLus = async () => {
    if (!id || !utilisateur?.id) return;

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
        console.log('Messages du ticket marqués comme lus (admin)');
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
    if (!id || !utilisateur?.id) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/setUserActiveOnTicket.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUtilisateur: utilisateur.id,
          idTicket: id,
          isActive: isActive
        })
      });
      console.log(`Utilisateur marqué comme ${isActive ? 'actif' : 'inactif'} sur le ticket (admin)`);
    } catch (error) {
      console.error('Erreur lors du marquage d\'activité:', error);
    }
  };

  // Écoute Socket.IO pour les nouveaux messages
  useEffect(() => {
    if (!id || !utilisateur || !socketRef.current) return;

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

    const gestionnaireMessage = (nouveauMessage: any) => {
      setMessages((precedents) => {
        // Évite un doublon si le même message a déjà été injecté juste avant
        // (ex: rechargement de la conversation qui chevauche l'écho socket).
        const messageExists = precedents.slice(-5).some(existingMsg =>
          existingMsg.message === nouveauMessage.message &&
          existingMsg.idExpediteur === nouveauMessage.idExpediteur
        );
        return messageExists ? precedents : [...precedents, nouveauMessage];
      });

      // Si le message ne vient pas de moi, marquer automatiquement comme lu
      if (nouveauMessage.idExpediteur !== (utilisateur.idDirecteur ?? utilisateur.idTechnicien ?? utilisateur.idUtilisateur ?? utilisateur.id)) {
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

    socketRef.current.on('message', gestionnaireMessage);

    const gestionnaireMessageModifie = (donnees: any) => {
      setMessages((precedents) =>
        precedents.map((m) =>
          m.idMessage === donnees.idMessage
            ? { ...m, message: donnees.message, dateModification: donnees.dateModification }
            : m
        )
      );
    };
    socketRef.current.on('messageModifie', gestionnaireMessageModifie);

    const gestionnaireMessageSupprime = (donnees: any) => {
      setMessages((precedents) =>
        precedents.map((m) =>
          m.idMessage === donnees.idMessage ? { ...m, estSupprime: true, message: '', fichiersJoints: [], fichierJoint: null } : m
        )
      );
    };
    socketRef.current.on('messageSupprime', gestionnaireMessageSupprime);

    // Gestion de la fermeture de page avec beacon (plus fiable)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page cachée (changement d'onglet, fermeture, etc.)
        navigator.sendBeacon(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/setUserActiveOnTicket.php`,
          JSON.stringify({
            idUtilisateur: utilisateur.id,
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
          idUtilisateur: utilisateur.id,
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
      // Le socket peut déjà avoir été nettoyé (et sa ref remise à null) par le
      // cleanup de l'effet de cycle de vie du socket, qui s'exécute avant
      // celui-ci au démontage — sans ce garde, `.off` plante sur `null`.
      if (socketRef.current) {
        socketRef.current.off('message', gestionnaireMessage);
        socketRef.current.off('messageModifie', gestionnaireMessageModifie);
        socketRef.current.off('messageSupprime', gestionnaireMessageSupprime);
      }
    };
  }, [id, utilisateur]);



  // Fonctions utilitaires
  const obtenirInitiales = (nom: string, prenom: string) => {
    if (!nom && !prenom) return 'U';
    return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase();
  };

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
        setMessages((precedents) =>
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
        setMessages((precedents) =>
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

  const gererEnvoiMessage = async () => {
    // Garde anti-double-envoi : la touche Entrée appelle cette fonction sans
    // passer par l'attribut "disabled" du bouton Envoyer, donc un appui
    // répété rapide (répétition clavier, ou Entrée suivi d'un clic) pouvait
    // déclencher deux envois du même message avant que le premier n'ait eu
    // le temps de vider le champ — d'où le même message (et le même email de
    // notification) envoyé deux fois.
    if (estEnvoiMessage) return;
    if (!message.trim() && !file) return;

    setEstEnvoiMessage(true);

    try {
      // Utiliser le bon identifiant selon le rôle
      const idExpediteur = utilisateur.idDirecteur ?? utilisateur.idTechnicien ?? utilisateur.idUtilisateur ?? utilisateur.id;
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
        if (data.success && data.cheminFichier) {
          fichierJoint = data.cheminFichier;
        } else {
          alert('Erreur upload fichier : ' + (data.error || 'inconnue'));
        }
      }

      const nouveauMessage = {
        idTicket: ticket.idTicket,
        idExpediteur,
        // Cette page est exclusivement utilisée par un compte admin (table
        // "utilisateur") : le type est donc toujours connu avec certitude,
        // jamais à deviner côté lecture (cf. getChatMessages.php).
        typeExpediteur: 'utilisateur',
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        avatar: utilisateur.avatar || null,
        message: message.trim(),
        dateEnvoi: new Date().toISOString(),
        fichierJoint
      };

      // Envoyer via socket.io ET sauvegarder en base
      socketRef.current.emit('message', nouveauMessage);

            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/saveChatMessage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(nouveauMessage)
      });

          setMessage('');
      setFile(null);

    // Auto-scroll vers le bas du chat après envoi
    setTimeout(() => {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }
    }, 100);
    } catch (erreur) {
      console.error('Erreur envoi message:', erreur);
      // En cas d'erreur, on peut remettre le message dans le champ
      setMessage(message);
    } finally {
      setEstEnvoiMessage(false);
    }
  };

  if (estChargement) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center py-24 text-slate-500">
          <Loader2 size={20} className="animate-spin mr-2" /> Chargement du ticket...
        </div>
      </DashboardLayout>
    );
  }

  if (!ticket || !utilisateur) {
    return (
      <DashboardLayout role="admin">
        <div className="text-center py-24 text-red-600 font-medium">Ticket non trouvé</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={`Ticket #${ticket.idTicket}`}
        description={ticket.titre}
        actions={
          <div className="flex items-center gap-2">
            <StatutBadge statut={ticket.statut} />
            <PrioriteBadge priorite={ticket.priorite} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Colonne gauche - Détails du ticket */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Info size={16} className="text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-900">Informations du ticket</h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ID</span>
                <span className="font-medium text-slate-900">#{ticket.idTicket}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Créé par</span>
                <span className="font-medium text-slate-900">
                  {(ticket.prenomUtilisateur || ticket.prenom || '')} {(ticket.nomUtilisateur || ticket.nom || 'Utilisateur inconnu')}
                </span>
              </div>

              {ticket.nomTechnicien && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Technicien assigné</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-semibold">
                      {obtenirInitiales(ticket.nomTechnicien, ticket.prenomTechnicien)}
                    </div>
                    <span className="font-medium text-slate-900">{ticket.prenomTechnicien} {ticket.nomTechnicien}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Date création</span>
                <span className="font-medium text-slate-900">
                  {ticket.dateCreation ?
                    new Date(ticket.dateCreation).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : 'Non définie'
                  }
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Messages</span>
                <span className="font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md">{messages.length}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <Users size={16} className="text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-900">Membres du ticket</h3>
            </CardHeader>
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
                <select
                  value={idCollegueSelectionne}
                  onChange={(e) => setIdCollegueSelectionne(e.target.value)}
                  className="flex-1 text-sm border border-slate-200 rounded-md px-2 py-1.5 text-slate-700"
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
                </select>
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

          <Card>
            <CardHeader className="flex items-center gap-2">
              <FileText size={16} className="text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-900">Description du problème</h3>
            </CardHeader>
            <CardBody>
              <div className="bg-slate-50 rounded-md p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {ticket.description}
              </div>
              {ticket.pieceJointe && (
                <div className="mt-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pièce(s) jointe(s)</span>
                  <ul className="mt-2 flex flex-col gap-2">
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
                            <a href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 underline text-sm">{f.split('/').pop()}</a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Colonne droite - Chat */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-[640px] overflow-hidden">
            <CardHeader className="flex items-center gap-3 shrink-0">
              <span className="w-9 h-9 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center"><MessageCircle size={18} /></span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Discussion du ticket</h3>
                <p className="text-xs text-slate-500">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
              </div>
            </CardHeader>

            {/* Zone des messages */}
            <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-5 bg-slate-50">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">
                  <MessageCircle size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-semibold">Aucun message pour le moment</p>
                  <p className="text-xs mt-1">Commencez la discussion en écrivant votre premier message</p>
                </div>
              ) : (
                <>
                  <div className="text-center my-4">
                    <span className="inline-block bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full border border-amber-200">
                      Discussion ouverte le {
                        ticket.dateCreation ?
                          new Date(ticket.dateCreation).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }) : 'aujourd\'hui'
                      }
                    </span>
                  </div>

                  {messages.map((msg, index) => {
                    // Vérifier si c'est mon message en comparant avec tous mes identifiants possibles
                    // Cette page est exclusivement utilisée par un compte admin
                    // (table "utilisateur") : on vérifie aussi le type quand il
                    // est connu, sinon un idTechnicien identique par coïncidence
                    // ferait apparaître le message d'un technicien comme le sien.
                    const monId = utilisateur.idUtilisateur ?? utilisateur.id;
                    const estMonMessage = msg.idExpediteur === monId && (msg.typeExpediteur == null || msg.typeExpediteur === 'utilisateur');

                    // Affichage multi-pièces jointes
                    let renduFichierJoint: React.ReactNode = null;
                    const liste = Array.isArray(msg.fichiersJoints) && msg.fichiersJoints.length > 0
                      ? msg.fichiersJoints
                      : (msg.fichierJoint ? [msg.fichierJoint] : []);
                    if (liste.length > 0) {
                      renduFichierJoint = (
                        <div className="mt-2">
                          {liste.map((f: string, i: number) => {
                            const ext = f.split('.').pop()?.toLowerCase();
                            const isImage = ['png','jpg','jpeg','gif','webp'].includes(ext || '');
                            const chemin = `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`;
                            return isImage ? (
                              <img
                                key={i}
                                src={chemin}
                                alt="fichier joint"
                                className="max-w-[180px] max-h-[120px] mt-2 rounded-md cursor-pointer block"
                                onClick={() => {
                                  setLightboxImg(chemin);
                                  setLightboxOpen(true);
                                }}
                              />
                            ) : (
                              <div key={i}>
                                <a href={chemin} target="_blank" rel="noopener noreferrer" className="text-brand-100 hover:underline mt-2 inline-block text-sm">
                                  {f.split('/').pop()}
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-3 mb-5 ${estMonMessage ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {!estMonMessage && (
                          <Avatar
                            photoUrl={msg.photoprofil}
                            nom={msg.nom || msg.nomExpediteur || msg.nomUtilisateur}
                            prenom={msg.prenom || msg.prenomExpediteur}
                            size={36}
                            style={{ flexShrink: 0 }}
                          />
                        )}

                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-3 text-sm ${
                            estMonMessage
                              ? 'bg-brand-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        >
                          {!estMonMessage && (
                            <div className="font-semibold text-xs mb-1 text-slate-500">
                              {msg.prenom || msg.prenomExpediteur || ''} {msg.nom || msg.nomExpediteur || msg.nomUtilisateur || 'Utilisateur inconnu'}
                            </div>
                          )}

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
                            <div className="leading-relaxed whitespace-pre-wrap break-words">
                              {msg.message}
                            </div>
                          )}
                          {renduFichierJoint}

                          {messageEnEditionId !== msg.idMessage && (
                            <div className={`flex items-center gap-1.5 text-xs mt-2 ${estMonMessage ? 'text-brand-100' : 'text-slate-400'}`}>
                              <span>
                                {new Date(msg.dateEnvoi).toLocaleString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit'
                                })}
                                {msg.dateModification ? ' (modifié)' : ''}
                              </span>
                              {estMonMessage && !msg.estSupprime && (
                                <>
                                  <button
                                    type="button"
                                    title="Modifier ce message"
                                    onClick={() => demarrerEdition(msg)}
                                    className="text-brand-100 hover:text-white"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Supprimer ce message"
                                    onClick={() => supprimerMessageChat(msg)}
                                    className="text-brand-100 hover:text-white"
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
                </>
              )}
            </div>

            {/* Zone de saisie */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
              <div className="flex items-end gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-brand-600 hover:bg-slate-100 shrink-0"
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
                <div className="flex-1 relative">
                  {file && (
                    <div className="text-brand-600 text-xs mb-1 flex items-center gap-1"><Paperclip size={12} /> {file.name}</div>
                  )}
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        gererEnvoiMessage();
                      }
                    }}
                    placeholder="Tapez votre message... (Maj+Entrée pour nouvelle ligne)"
                    className="w-full border-none bg-transparent text-sm resize-none outline-none min-h-[20px] max-h-[100px] text-slate-800"
                    rows={1}
                  />
                  <div className={`absolute bottom-0 right-0 text-[11px] font-medium px-1.5 py-0.5 rounded ${
                    message.length > 500 ? 'text-red-600' : message.length > 400 ? 'text-amber-600' : 'text-slate-400'
                  }`}>
                    {message.length}/550
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={gererEnvoiMessage}
                  disabled={!message.trim() || estEnvoiMessage}
                  icon={estEnvoiMessage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                >
                  {estEnvoiMessage ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Lightbox pour les images */}
      {lightboxOpen && lightboxImg && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 cursor-zoom-out"
        >
          <img
            src={lightboxImg}
            alt="Agrandissement"
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-md bg-white p-2"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="fixed top-6 right-8 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/80 z-[2100]"
            aria-label="Fermer la lightbox"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
