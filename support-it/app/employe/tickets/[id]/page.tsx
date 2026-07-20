'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import Avatar from '../../../../components/Avatar';
import { MessageCircle, MessageSquareOff, Check, X, Paperclip, Loader2, Send, ArrowLeft, Info, FileText } from 'lucide-react';
import DashboardLayout from '../../../../components/ui/DashboardLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card';
import { Textarea } from '../../../../components/ui/Input';
import Button from '../../../../components/ui/Button';
import { StatutBadge, PrioriteBadge } from '../../../../components/ui/Badge';
import EmptyState from '../../../../components/ui/EmptyState';

// If a WidgetRdv component is not available at the expected path,
// provide a lightweight local fallback to avoid build errors.
// Replace or remove this fallback if the real component is added.
const WidgetRdv: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  return (
    <div style={{ display: 'none' }}>
      {/* fallback placeholder */}
      <button onClick={onClose}>Close RDV</button>
    </div>
  );
};

export default function DetailTicketEmploye() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [estChargement, setEstChargement] = useState(true);
  const [estEnvoiMessage, setEstEnvoiMessage] = useState(false);

  const socketRef = useRef<any>(null);
  // États pour la lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showRdvModal, setShowRdvModal] = useState(false); // Added state for WidgetRdv
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rdvStatus, setRdvStatus] = useState<string | null>(null);
  const [rdv, setRdv] = useState<any>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [fichiersTicket, setFichiersTicket] = useState<string[]>([]);

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

  // Chargement du ticket et de l'utilisateur
  useEffect(() => {
    const chargerDonnees = async () => {
      if (!id) return;

      try {
        const reponseTicket = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php?idTicket=${id}`, {
          credentials: 'include',
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

          // Vérification de sécurité côté client pour les employés
          const donneesUtilisateur = localStorage.getItem('user');
          if (donneesUtilisateur) {
            const utilisateurParse = JSON.parse(donneesUtilisateur);
            // Patch : si le champ role n'existe pas, on l'ajoute (employé par défaut sur cette page)
            if (!utilisateurParse.role) {
              utilisateurParse.role = 'employe';
              localStorage.setItem('user', JSON.stringify(utilisateurParse));
            }

            // Si le ticket n'appartient pas à l'utilisateur connecté
            // Vérifier plusieurs champs d'ID possibles pour gérer les différents types d'utilisateurs
            const userIds = [
              utilisateurParse.id,
              utilisateurParse.idUtilisateur,
              utilisateurParse.idTechnicien,
              utilisateurParse.idDirecteur,
              utilisateurParse.idAdmin,
            ].filter((id) => id != null && id !== undefined);

            if (!userIds.includes(ticketData.idUtilisateur)) {
              console.error('Accès non autorisé : ce ticket ne vous appartient pas');
              console.log('Ticket idUtilisateur:', ticketData.idUtilisateur);
              console.log('Utilisateur IDs:', userIds);
              alert("Vous n'êtes pas autorisé à accéder à ce ticket. Il ne vous appartient pas.");
              // Route corrigée : la liste des tickets employé est /employe/ticket (singulier),
              // /employe/tickets n'existe pas en tant que page (seule /employe/tickets/[id] existe).
              router.push('/employe/ticket');
              return;
            }

            setUtilisateur(utilisateurParse);
          }

          setTicket(ticketData);
          // Charger les fichiers du ticket
          await chargerFichiersTicket(id as string);
        } else {
          throw new Error('Ticket non trouvé');
        }

        setEstChargement(false);
      } catch (erreur) {
        console.error('Erreur chargement:', erreur);

        if (erreur instanceof Error && erreur.message === 'ACCES_NON_AUTORISE') {
          alert("Vous n'êtes pas autorisé à accéder à ce ticket. Il ne vous appartient pas.");
        } else {
          alert('Erreur lors du chargement du ticket.');
        }

        router.push('/employe/ticket');
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
          credentials: 'include',
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

  // Fonction pour marquer les notifications du ticket comme lues
  const marquerNotificationsTicketLues = async () => {
    if (!id || !utilisateur) return;

    // Utiliser le bon ID selon le type d'utilisateur
    const userId = utilisateur.idUtilisateur || utilisateur.id || utilisateur.idTechnicien || utilisateur.idDirecteur || utilisateur.idAdmin;
    if (!userId) return;

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markTicketNotificationsAsRead',
          idUtilisateur: userId,
          idTicket: id,
        }),
      });
      console.log('Notifications du ticket marquées comme lues (employé)');
    } catch (error) {
      console.error('Erreur lors du marquage des notifications:', error);
    }
  };

  // Fonction pour marquer les messages du ticket comme lus
  const marquerMessagesTicketLus = async () => {
    if (!id || !utilisateur) return;

    // Utiliser le bon ID selon le type d'utilisateur
    const userId = utilisateur.idUtilisateur || utilisateur.id || utilisateur.idTechnicien || utilisateur.idDirecteur || utilisateur.idAdmin;
    if (!userId) return;

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
      if (data.success) {
        console.log('Messages du ticket marqués comme lus (employé)');
      } else {
        console.error('Erreur marquage messages:', data.error);
      }
    } catch (error) {
      console.error('Erreur lors du marquage des messages:', error);
    }
  };

  // Fonction pour indiquer l'activité sur le ticket
  const setUserActiveOnTicket = async (isActive: boolean) => {
    if (!id || !utilisateur) return;

    // Utiliser le bon ID selon le type d'utilisateur
    const userId = utilisateur.idUtilisateur || utilisateur.id || utilisateur.idTechnicien || utilisateur.idDirecteur || utilisateur.idAdmin;
    if (!userId) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/setUserActiveOnTicket.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUtilisateur: userId,
          idTicket: id,
          isActive: isActive,
        }),
      });
      console.log(`Utilisateur marqué comme ${isActive ? 'actif' : 'inactif'} sur le ticket (employé)`);
    } catch (error) {
      console.error("Erreur lors du marquage d'activité:", error);
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
      setMessages((precedents) => [...precedents, nouveauMessage]);

      // Si le message ne vient pas de moi, marquer automatiquement comme lu
      const userId = utilisateur.idUtilisateur || utilisateur.id || utilisateur.idTechnicien || utilisateur.idDirecteur || utilisateur.idAdmin;
      if (nouveauMessage.idExpediteur !== userId) {
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

    // Gestion de la fermeture de page avec beacon (plus fiable)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page cachée (changement d'onglet, fermeture, etc.)
        const userId = utilisateur.idUtilisateur || utilisateur.id || utilisateur.idTechnicien || utilisateur.idDirecteur || utilisateur.idAdmin;
        navigator.sendBeacon(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/setUserActiveOnTicket.php`,
          JSON.stringify({
            idUtilisateur: userId,
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
          idUtilisateur: utilisateur.id,
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
      socketRef.current.off('message', gestionnaireMessage);
    };
  }, [id, utilisateur]);

  // Fonctions utilitaires
  const obtenirCouleurDepuisNom = (nom: string) => {
    const couleurs = ['#6B46C1', '#4c6ef5', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b'];
    let somme = 0;
    for (let i = 0; i < nom.length; i++) somme += nom.charCodeAt(i);
    return couleurs[somme % couleurs.length];
  };

  const gererEnvoiMessage = async () => {
    if (!message.trim() && !file && files.length === 0) return;

    setEstEnvoiMessage(true);

    try {
      // Utiliser le bon ID selon le type d'utilisateur
      const idExpediteur = utilisateur.idUtilisateur || utilisateur.id || utilisateur.idTechnicien || utilisateur.idDirecteur || utilisateur.idAdmin;
      let fichierJoint: string | null = null;
      let fichiersJoints: string[] = [];

      // Gérer l'upload de plusieurs fichiers
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
      } else if (file) {
        // Compatibilité avec l'ancien système
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
          fichiersJoints = [data.cheminFichier];
        } else {
          alert('Erreur upload fichier : ' + (data.error || 'inconnue'));
        }
      }

      const nouveauMessage = {
        idTicket: ticket.idTicket,
        idExpediteur,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        avatar: utilisateur.avatar || null,
        message: message.trim(),
        dateEnvoi: new Date().toISOString(),
        fichierJoint,
        fichiersJoints,
      };

      // Ne pas ajouter le message localement - laisser socket.io gérer l'affichage
      // setMessages((precedents) => [...precedents, nouveauMessage]);

      // Envoyer via socket.io ET sauvegarder en base
      socketRef.current.emit('message', nouveauMessage);

      console.log('DEBUG - Envoi du message au backend:', nouveauMessage);

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
      // En cas d'erreur, on peut remettre le message dans le champ
      setMessage(message);
    } finally {
      setEstEnvoiMessage(false);
    }
  };

  // Fonction pour recharger les messages du chat
  const chargerMessages = async () => {
    if (!id) return;
    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getChatMessages.php?idTicket=${id}`, {
        credentials: 'include',
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

  // Fonction pour charger le RDV complet
  const chargerRdv = async () => {
    if (!id) return;
    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRdvByTicket.php?idTicket=${id}`, { credentials: 'include' });
      const donnees = await reponse.json();
      setRdv(donnees && donnees.rdv ? donnees.rdv : null);
      setRdvStatus(donnees && donnees.rdv && donnees.rdv.Acceptation ? donnees.rdv.Acceptation : null);
    } catch (e) {
      setRdv(null);
      setRdvStatus(null);
    }
  };

  // Remplace useEffect(() => { chargerStatutRDV(); }, [id]);
  useEffect(() => {
    chargerRdv();
  }, [id]);

  // Utilitaire pour vérifier si l'utilisateur est un employé (insensible à la casse et accents)
  function estEmploye(utilisateur: { role: string }) {
    if (!utilisateur || !utilisateur.role) return false;
    // On normalise : minuscules, sans accents
    return utilisateur.role
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .includes('employ');
  }

  // Échappe les caractères HTML pour empêcher toute injection avant la linkification
  // (le message vient d'un autre utilisateur du ticket et est rendu via dangerouslySetInnerHTML,
  // donc il doit être neutralisé avant d'y insérer nos propres balises <a>).
  const echapperHtml = (texte: string) =>
    texte
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  // Fonction pour rendre les liens cliquables dans un message
  const rendreLinksCliquables = (texte: string) => {
    if (!texte) return texte;

    const texteEchappe = echapperHtml(texte);

    // Regex pour détecter les URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

    // Remplacer les URLs
    let result = texteEchappe.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3d47c2; text-decoration: underline;">${url}</a>`;
    });

    // Remplacer les emails
    result = result.replace(emailRegex, (email) => {
      return `<a href="mailto:${email}" style="color: #3d47c2; text-decoration: underline;">${email}</a>`;
    });

    return result;
  };

  if (estChargement) {
    return (
      <DashboardLayout role="employe">
        <div className="flex items-center justify-center py-24 text-slate-500 text-sm gap-2">
          <Loader2 size={18} className="animate-spin" />
          Chargement du ticket...
        </div>
      </DashboardLayout>
    );
  }

  if (!ticket || !utilisateur) {
    return (
      <DashboardLayout role="employe">
        <EmptyState title="Ticket non trouvé" description="Ce ticket n'existe pas ou vous n'y avez pas accès." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="employe">
      <PageHeader
        title={`Ticket #${ticket.idTicket}`}
        description={ticket.titre}
        actions={
          <>
            <StatutBadge statut={ticket.statut} />
            <PrioriteBadge priorite={ticket.priorite} />
            <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => router.push('/employe/ticket')}>
              Retour
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne gauche - Détails du ticket */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Info size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Informations du ticket</h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ID</span>
                <span className="font-medium text-slate-900">#{ticket.idTicket}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Auteur</span>
                <span className="font-medium text-slate-900">{ticket.auteur || 'Non défini'}</span>
              </div>
              {ticket.assignee && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Technicien assigné</span>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-[11px] font-semibold">
                      {ticket.assignee.avatar}
                    </span>
                    <span className="font-medium text-slate-900">{ticket.assignee.nom}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date création</span>
                <span className="font-medium text-slate-900">
                  {ticket.dateCreation
                    ? new Date(ticket.dateCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'Non définie'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Messages</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                  {messages.length}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Description du problème</h3>
            </CardHeader>
            <CardBody>
              <div className="bg-slate-50 rounded-md p-4 text-sm text-slate-700 whitespace-pre-wrap break-words max-h-52 overflow-y-auto">
                {ticket.description}
              </div>

              {/* Pièces jointes du ticket (lors de la création) */}
              {fichiersTicket.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm font-semibold text-slate-900">Pièce(s) jointe(s) lors de la création :</span>
                  <ul className="mt-2 flex flex-col gap-2">
                    {fichiersTicket.map((f, i) => {
                      const ext = f.split('.').pop()?.toLowerCase();
                      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
                      return (
                        <li key={i}>
                          {isImage ? (
                            <a
                              href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block border border-slate-200 rounded-md overflow-hidden bg-white"
                            >
                              <img src={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} alt={f.split('/').pop()} className="max-w-[180px] max-h-[120px] block" />
                            </a>
                          ) : (
                            <a
                              href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 hover:text-brand-700 underline text-sm"
                            >
                              {f.split('/').pop()}
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Fallback pour l'ancien système de pièce jointe unique */}
              {!fichiersTicket.length && ticket.pieceJointe && (
                <div className="mt-3">
                  <span className="text-sm font-semibold text-slate-900">Pièce jointe :</span>
                  <ul className="mt-2 flex flex-col gap-2">
                    {(Array.isArray(ticket.pieceJointe) ? ticket.pieceJointe : String(ticket.pieceJointe).split(','))
                      .filter((f: any) => f)
                      .map((f: string, i: React.Key | null | undefined) => {
                        const ext = f.split('.').pop()?.toLowerCase();
                        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
                        return (
                          <li key={i}>
                            {isImage ? (
                              <a
                                href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block border border-slate-200 rounded-md overflow-hidden bg-white"
                              >
                                <img src={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} alt={f.split('/').pop()} className="max-w-[180px] max-h-[120px] block" />
                              </a>
                            ) : (
                              <a
                                href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-600 hover:text-brand-700 underline text-sm"
                              >
                                {f.split('/').pop()}
                              </a>
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
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <CardHeader className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <MessageCircle size={18} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Discussion du ticket</h3>
              <p className="text-xs text-slate-500">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
            </div>
          </CardHeader>

          {/* Zone des messages */}
          <div ref={chatMessagesRef} className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50 min-h-[420px] max-h-[560px]">
            {messages.length === 0 ? (
              <EmptyState
                icon={<MessageSquareOff size={22} />}
                title="Aucun message pour le moment"
                description="Commencez la discussion en écrivant votre premier message."
              />
            ) : (
              <>
                {/* Message système */}
                <div className="text-center my-4">
                  <span className="inline-block px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                    Discussion ouverte le{' '}
                    {ticket.dateCreation
                      ? new Date(ticket.dateCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : "aujourd'hui"}
                  </span>
                </div>

                {/* Messages */}
                {messages.map((msg, index) => {
                  // Vérifier si le message est de l'utilisateur connecté en utilisant tous les IDs possibles
                  const userIds = [
                    utilisateur.idUtilisateur,
                    utilisateur.id,
                    utilisateur.idTechnicien,
                    utilisateur.idDirecteur,
                    utilisateur.idAdmin,
                  ].filter((id) => id != null && id !== undefined);
                  const estMonMessage = userIds.includes(msg.idExpediteur);
                  const couleurAvatar = obtenirCouleurDepuisNom(msg.nom || '');
                  // Détection d'un message de proposition de RDV (par exemple, on cherche une phrase clé)
                  const isRdvPropose = msg.message && msg.message.startsWith('Un rendez-vous vous est proposé');

                  // Affichage des pièces jointes multiples
                  let renduFichiersJoints: React.ReactNode = null;
                  const fichiersAfficher = msg.fichiersJoints && msg.fichiersJoints.length > 0 ? msg.fichiersJoints : msg.fichierJoint ? [msg.fichierJoint] : [];

                  if (fichiersAfficher.length > 0) {
                    renduFichiersJoints = (
                      <div className="mt-2 flex flex-col gap-2">
                        {fichiersAfficher.map((fichier: string, fileIdx: number) => {
                          const ext = fichier.split('.').pop()?.toLowerCase();
                          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
                          const chemin = `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${fichier}`;
                          return (
                            <div key={fileIdx}>
                              {isImage ? (
                                <img
                                  src={chemin}
                                  alt={`fichier joint ${fileIdx + 1}`}
                                  className="max-w-[180px] max-h-[120px] rounded-md cursor-pointer"
                                  onClick={() => {
                                    setLightboxImg(chemin);
                                    setLightboxOpen(true);
                                  }}
                                />
                              ) : (
                                <a href={chemin} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-block text-sm">
                                  {fichier.split('/').pop()}
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Carte RDV moderne
                  let renduCarteRDV: React.ReactNode = null;
                  if (isRdvPropose) {
                    // Recherche la date et l'heure dans le message (format: "le YYYY-MM-DD à HH:MM")
                    let dateRdv = '';
                    let heureRdv = '';
                    const match = msg.message.match(/le (\d{4}-\d{2}-\d{2}) à (\d{2}:\d{2})/);
                    if (match) {
                      // Format européen
                      const [annee, mois, jour] = match[1].split('-');
                      dateRdv = `${jour}/${mois}/${annee}`;
                      heureRdv = match[2];
                    }
                    renduCarteRDV = (
                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-6 py-5 flex flex-col items-center gap-3 min-w-[240px]">
                        <div className="text-sm font-semibold text-brand-700 tracking-wide">Rendez-vous proposé</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {dateRdv && heureRdv ? `${dateRdv} à ${heureRdv}` : msg.message.replace('Un rendez-vous vous est proposé', '').replace('le ', '').replace('.', '').trim()}
                        </div>
                        {rdvStatus === 'Attente' ? (
                          estEmploye(utilisateur) ? (
                            <div className="flex gap-3 justify-center">
                              <Button
                                variant="success"
                                size="sm"
                                title="Accepter le RDV"
                                icon={<Check size={16} />}
                                onClick={async () => {
                                  if (!rdv || !rdv.idCalendrier) {
                                    alert('Erreur RDV');
                                    return;
                                  }
                                  // DEBUG : Affiche les données envoyées
                                  console.log({
                                    idCalendrier: rdv.idCalendrier,
                                    idTicket: ticket.idTicket,
                                    reponse: 'accepte',
                                    idUtilisateur: utilisateur.id,
                                  });
                                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/updateRDV.php`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      idCalendrier: rdv.idCalendrier,
                                      idTicket: ticket.idTicket,
                                      reponse: 'accepte',
                                      idUtilisateur: utilisateur.id,
                                    }),
                                  });
                                  const text = await response.text();
                                  console.log('Réponse brute updateRDV.php :', text);
                                  let data;
                                  try {
                                    data = JSON.parse(text);
                                  } catch (e) {
                                    alert('Erreur serveur : ' + text);
                                    return;
                                  }
                                  if (!data.success) {
                                    alert('Erreur : ' + (data.error || 'Erreur inconnue'));
                                    return;
                                  }
                                  await chargerRdv();
                                  const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getChatMessages.php?idTicket=${msg.idTicket || ticket.idTicket}`);
                                  const donnees = await reponse.json();
                                  setMessages(donnees || []);
                                }}
                              >
                                Accepter
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                title="Refuser le RDV"
                                icon={<X size={16} />}
                                onClick={async () => {
                                  if (!rdv || !rdv.idCalendrier) {
                                    alert('Erreur RDV');
                                    return;
                                  }
                                  // DEBUG : Affiche les données envoyées
                                  console.log({
                                    idCalendrier: rdv.idCalendrier,
                                    idTicket: ticket.idTicket,
                                    reponse: 'refuse',
                                    idUtilisateur: utilisateur.id,
                                  });
                                  await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/updateRDV.php`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      idCalendrier: rdv.idCalendrier,
                                      idTicket: ticket.idTicket,
                                      reponse: 'refuse',
                                      idUtilisateur: utilisateur.id,
                                    }),
                                  });
                                  await chargerRdv();
                                  const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getChatMessages.php?idTicket=${msg.idTicket || ticket.idTicket}`);
                                  const donnees = await reponse.json();
                                  setMessages(donnees || []);
                                }}
                              >
                                Refuser
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-3 justify-center opacity-50">
                              <Button variant="success" size="sm" disabled icon={<Check size={16} />}>Accepter</Button>
                              <Button variant="danger" size="sm" disabled icon={<X size={16} />}>Refuser</Button>
                            </div>
                          )
                        ) : rdvStatus === 'Accepté' ? (
                          <div className="text-emerald-600 font-semibold text-sm">RDV accepté</div>
                        ) : rdvStatus === 'Refusé' ? (
                          <div className="text-red-600 font-semibold text-sm">RDV refusé</div>
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <div key={index} className={`flex items-start gap-3 mb-4 ${estMonMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      {!estMonMessage && (
                        <Avatar
                          photoUrl={msg.photoprofil}
                          nom={msg.nom || msg.nomExpediteur || msg.nomUtilisateur}
                          prenom={msg.prenom || msg.prenomExpediteur}
                          size={36}
                        />
                      )}

                      {/* Message ou carte RDV */}
                      <div
                        className={`max-w-[70%] min-w-[160px] break-words rounded-lg px-4 py-3 ${
                          estMonMessage ? 'bg-brand-600 text-white' : 'bg-white text-slate-900 border border-slate-200'
                        }`}
                      >
                        {/* Nom de l'expéditeur pour les messages des autres */}
                        {!estMonMessage && (
                          <div className="text-xs font-semibold mb-1.5" style={{ color: couleurAvatar }}>
                            {msg.prenom || msg.prenomExpediteur || ''} {msg.nom || msg.nomExpediteur || msg.nomUtilisateur || 'Utilisateur inconnu'}
                          </div>
                        )}

                        {/* Contenu du message ou carte RDV */}
                        {renduCarteRDV || (
                          <>
                            <div
                              className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                              dangerouslySetInnerHTML={{ __html: rendreLinksCliquables(msg.message) }}
                            />
                            {renduFichiersJoints}
                          </>
                        )}
                        {/* Timestamp */}
                        <div className={`text-[11px] mt-1.5 ${estMonMessage ? 'text-white/70' : 'text-slate-400'}`}>
                          {new Date(msg.dateEnvoi).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Zone de saisie */}
          <div className="px-4 py-3 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-2 bg-slate-50 rounded-lg border border-slate-200 p-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-md bg-white border border-slate-200 flex items-center justify-center text-brand-600 hover:bg-slate-100 cursor-pointer shrink-0"
                title="Joindre un fichier"
              >
                <Paperclip size={16} />
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
              <div className="flex-1 flex flex-col gap-1">
                {files && files.length > 0 && (
                  <div className="text-xs text-brand-600 flex flex-col gap-0.5">
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Paperclip size={11} /> {f.name}
                      </div>
                    ))}
                  </div>
                )}
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      gererEnvoiMessage();
                    }
                  }}
                  placeholder="Tapez votre message... (Maj+Entrée pour nouvelle ligne)"
                  rows={1}
                  className="border-none bg-transparent shadow-none focus:ring-0 h-auto py-1.5 min-h-[20px] max-h-[100px] resize-none"
                  maxLength={550}
                />
              </div>
              <Button
                variant="primary"
                onClick={gererEnvoiMessage}
                disabled={!message.trim() || estEnvoiMessage}
                loading={estEnvoiMessage}
                icon={<Send size={16} />}
                className="shrink-0"
              >
                Envoyer
              </Button>
            </div>
            <div className="text-right text-[11px] text-slate-400 mt-1">{message.length}/550</div>
          </div>
        </Card>
      </div>

      {showRdvModal && (
        <WidgetRdv
          {...({
            onClose: () => {
              setShowRdvModal(false);
              chargerMessages();
            },
            idTicket: ticket.idTicket,
            idUtilisateur: utilisateur.id,
            idTechnicien: ticket.assignee?.id || null,
          } as any)}
        />
      )}

      {lightboxOpen && lightboxImg && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center cursor-zoom-out"
        >
          <img
            src={lightboxImg}
            alt="Agrandissement"
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-md bg-white p-2"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="fixed top-8 right-10 bg-black/60 text-white rounded-full w-10 h-10 text-2xl cursor-pointer z-[2100] flex items-center justify-center"
            aria-label="Fermer la lightbox"
          >
            ×
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
