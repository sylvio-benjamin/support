'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
// @ts-ignore: CSS module declaration missing for react-toastify side-effect import
import 'react-toastify/dist/ReactToastify.css';

import { io } from 'socket.io-client';
import { Search, X, ArrowUpRight, UserPlus, Zap } from 'lucide-react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Input, Select } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { StatutBadge, PrioriteBadge, PrioriteDot, MessagesNonLusBadge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { playNotificationSound } from '../../../utils/notificationSound';
import useNotificationSoundUnlock from '../../../hooks/useNotificationSoundUnlock';
import { EVENEMENT_RAFRAICHIR_NOTIFICATIONS } from '../../../lib/notificationEvents';
import { obtenirEnTeteCsrf } from '../../../lib/csrf';

function parseDescription(desc: string) {
  // On cherche les sections par mot-clé
  const regex = /Problème rencontré *:([\s\S]*?)Actions déjà tentées *:([\s\S]*?)Impact *:([\s\S]*)/i;
  const match = desc.match(regex);
  if (match) {
    const probleme = match[1].trim();
    const actions = match[2].trim().split(/\n|\r|\r\n|\*/).map(a => a.trim()).filter(a => a);
    const impact = match[3].trim();
    return { probleme, actions, impact };
  }
  return { probleme: desc, actions: [], impact: '' };
}

function TicketModal({
  ticket,
  onClose,
  techniciens,
  onAssigner,
}: {
  ticket: any;
  onClose: () => void;
  techniciens: any[];
  onAssigner: (idTicket: number, idTechnicienCible: string) => void;
}) {
  const [technicienChoisi, setTechnicienChoisi] = useState('');
  if (!ticket) return null;
  let pieces: any[] = [];
  if (ticket.pieceJointe) {
    if (Array.isArray(ticket.pieceJointe)) pieces = ticket.pieceJointe;
    else if (typeof ticket.pieceJointe === 'string') pieces = ticket.pieceJointe.split(',').map((f: string) => f.trim()).filter(Boolean);
  }
  const desc = parseDescription(ticket.description || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Ticket #{ticket.idTicket} — {ticket.titre}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Colonne gauche : infos */}
          <div className="bg-slate-50 rounded-md p-5 md:col-span-1">
            <div className="text-sm font-semibold text-slate-900 mb-3">Informations du ticket</div>
            <dl className="text-sm text-slate-600 flex flex-col gap-1.5">
              <div><span className="font-medium text-slate-700">ID :</span> #{ticket.idTicket}</div>
              <div><span className="font-medium text-slate-700">Créé par :</span> {ticket.prenomUtilisateur} {ticket.nomUtilisateur}</div>
              <div><span className="font-medium text-slate-700">Entreprise :</span> {ticket.nomEntreprise || '-'}</div>
              <div><span className="font-medium text-slate-700">Assigné à :</span> {ticket.nomTechnicien ? ticket.nomTechnicien : '-'}</div>
              <div><span className="font-medium text-slate-700">Créé le :</span> {ticket.dateCreation ? ticket.dateCreation.split(' ')[0] : '-'}</div>
              <div><span className="font-medium text-slate-700">Mis à jour le :</span> {ticket.dateModification ? ticket.dateModification.split(' ')[0] : '-'}</div>
              <div><span className="font-medium text-slate-700">Catégorie :</span> {ticket.categorie}</div>
              <div><span className="font-medium text-slate-700">Service :</span> {ticket.serviceConcerne}</div>
            </dl>
            <div className="mt-4"><StatutBadge statut={ticket.statut} /></div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">Assigner à un collègue</p>
              <div className="flex gap-2">
                <Select value={technicienChoisi} onChange={(e) => setTechnicienChoisi(e.target.value)} className="flex-1 text-sm">
                  <option value="">Choix technicien</option>
                  {techniciens.filter((t) => t.role !== 'affichage').map((t) => {
                    const dejaAssigne = ticket.idTechnicien && t.idTechnicien == ticket.idTechnicien;
                    return (
                      <option key={t.idTechnicien} value={t.idTechnicien} disabled={!!dejaAssigne}>
                        {t.prenomTechnicien} {t.nomTechnicien}{dejaAssigne ? ' (déjà assigné)' : ''}
                      </option>
                    );
                  })}
                </Select>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!technicienChoisi}
                  onClick={() => onAssigner(ticket.idTicket, technicienChoisi)}
                >
                  Assigner
                </Button>
              </div>
            </div>
          </div>
          {/* Colonne droite : description structurée et pièces jointes */}
          <div className="bg-slate-50 rounded-md p-5 md:col-span-2">
            <div className="text-sm font-semibold text-slate-900 mb-3">Description du problème</div>
            <div className="text-sm text-slate-700 mb-3">
              <p className="font-medium text-slate-800 mb-1">Problème rencontré :</p>
              <p className="whitespace-pre-wrap">{desc.probleme}</p>
            </div>
            {desc.actions.length > 0 && (
              <div className="text-sm text-slate-700 mb-3">
                <p className="font-medium text-slate-800 mb-1">Actions déjà tentées :</p>
                <ul className="list-disc list-inside">
                  {desc.actions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            {desc.impact && (
              <div className="text-sm text-slate-700 mb-3">
                <p className="font-medium text-slate-800 mb-1">Impact :</p>
                <p className="whitespace-pre-wrap">{desc.impact}</p>
              </div>
            )}
            {pieces.length > 0 && (
              <div className="mt-4">
                <p className="font-medium text-slate-800 text-sm mb-2">Pièces jointes :</p>
                <ul className="flex flex-col gap-1.5">
                  {pieces.map((f: string, i: React.Key | null | undefined) => (
                    <li key={i}>
                      <a href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">{f.split('/').pop()}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalize(str: string) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[ -]/g, (c: string) => c.normalize ? c.normalize('NFD') : c)
    .replace(/\s+/g, '') // enlève tous les espaces
    .replace(/[̀-ͯ]/g, '') // enlève les accents
    .trim();
}

export default function TicketsTechnicien() {
  useAuthRedirect();
  useNotificationSoundUnlock();
  const [tickets, setTickets] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (!userData) return null;
      const parsed = JSON.parse(userData);
      // Le rôle vit dans la clé localStorage séparée "userRole", pas dans
      // l'objet "user" (voir FormulaireConnexion.tsx) — sans ce repli,
      // user.role est toujours undefined.
      parsed.role = parsed.role || localStorage.getItem('userRole') || '';
      return parsed;
    }
    return null;
  });
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [statut, setStatut] = useState('');
  const [priorite, setPriorite] = useState('');
  const [chargementUser, setChargementUser] = useState(true);
  const [chargementTickets, setChargementTickets] = useState(true);
  const [techniciens, setTechniciens] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTechnicien.php`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.techniciens) setTechniciens(d.techniciens); })
      .catch(() => setTechniciens([]));
  }, []);

  // Assignation directe depuis la liste (modale) : évite d'avoir à ouvrir la
  // fiche du ticket juste pour choisir un technicien.
  const assignerTicketA = async (idTicket: number, idTechnicienCible: string) => {
    if (!idTechnicienCible) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/assignerTicket.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...obtenirEnTeteCsrf() },
        body: JSON.stringify({ idTicket, idTechnicienCible }),
      });
      const data = await res.json();
      if (data.succes) {
        const tech = techniciens.find((t) => t.idTechnicien == idTechnicienCible);
        toast.success(`Ticket assigné à ${tech ? `${tech.prenomTechnicien} ${tech.nomTechnicien}` : 'ce technicien'}`);
        setTickets((prev) =>
          prev.map((t) =>
            t.idTicket === idTicket
              ? { ...t, idTechnicien: idTechnicienCible, nomTechnicien: tech?.nomTechnicien, prenomTechnicien: tech?.prenomTechnicien, statut: 'en_cours' }
              : t
          )
        );
        setSelectedTicket(null);
      } else {
        toast.error(data.erreur || "Erreur lors de l'assignation");
      }
    } catch (e) {
      toast.error("Erreur réseau lors de l'assignation");
    }
  };

  const fetchTickets = () => {
    setChargement(true);
    setChargementTickets(true); // S'assurer que tous les états de chargement sont synchronisés
    console.log('DÉBUT fetchTickets - Récupération des tickets...');

    // Déterminer l'endpoint à utiliser selon le rôle
    let endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php`;
    if (user && (user.role === 'referent' || user.role === 'admin')) {
      endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicketParEntreprise.php`;
    }

    fetch(endpoint, {
      credentials: 'include',
    })
      .then((res) => {
        console.log('Réponse HTTP status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('Données complètes reçues:', data);
        if (data.success === false) {
          console.error('Erreur backend:', data.error);
          toast.error(data.error || 'Erreur lors de la récupération des tickets');
        }
        if (data.tickets) {
          console.log('Nombre de tickets récupérés:', data.tickets.length);
          if (data.tickets.length > 0) {
            console.log('Premier ticket exemple:', data.tickets[0]);
          }
          setTickets(data.tickets);
        } else {
          console.warn('Aucun tickets dans la réponse - structure:', Object.keys(data));
          setTickets([]);
        }
        setChargement(false);
        setChargementTickets(false); // S'assurer que tous les états de chargement sont mis à jour
      })
      .catch((error) => {
        console.error('Erreur complète fetch tickets:', error);
        toast.error('Erreur de réseau lors de la récupération des tickets');
        setChargement(false);
        setChargementTickets(false); // S'assurer que tous les états de chargement sont mis à jour
      });
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      parsedUser.role = parsedUser.role || localStorage.getItem('userRole') || '';
      setUser(parsedUser);
      console.log('Utilisateur connecté:', parsedUser);
    }
    setChargementUser(false);
  }, []);

  // WebSocket ET récupération initiale des tickets
  useEffect(() => {
    if (
      user &&
      ((user.nom && user.prenom) || (user.nomUtilisateur && user.prenomUtilisateur))
    ) {
      // APPEL INITIAL pour récupérer les tickets au chargement
      fetchTickets();

      // Connexion WebSocket pour recevoir les notifications en temps réel
      const socket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`, {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });

      socket.on('tickets_mis_a_jour', (nouveauxTickets) => {
        console.log('WebSocket - Tickets mis à jour:', nouveauxTickets);
        setTickets(nouveauxTickets);
      });

      socket.on('nouveau_ticket', (ticket) => {
        toast.info(`Nouveau ticket de ${ticket.prenomUtilisateur || ''} ${ticket.nomUtilisateur || ''} : ${ticket.titre || ''}`);
        playNotificationSound();
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  // Revenir sur cette page (ex: bouton "Retour" depuis la fiche d'un ticket
  // qu'on vient de consulter) ne redéclenche pas forcément un rechargement des
  // données côté navigateur : le badge de messages non lus par ticket restait
  // donc affiché avec l'ancien nombre tant qu'on ne rechargeait pas la page
  // entièrement. 'focus' ne suffit pas : il ne se déclenche que si l'onglet
  // change de fenêtre, pas lors d'une navigation interne (bouton "Voir"/
  // "Continuer" puis retour) — Next.js peut garder cette page en cache sans
  // la démonter, donc son useEffect de chargement initial ne se relance pas
  // non plus. EVENEMENT_RAFRAICHIR_NOTIFICATIONS est déjà émis par la fiche
  // du ticket dès qu'on l'ouvre (cf. markTicketNotificationsRead.php) : on
  // s'en sert aussi ici pour forcer un rechargement au bon moment.
  useEffect(() => {
    window.addEventListener('focus', fetchTickets);
    window.addEventListener(EVENEMENT_RAFRAICHIR_NOTIFICATIONS, fetchTickets);
    return () => {
      window.removeEventListener('focus', fetchTickets);
      window.removeEventListener(EVENEMENT_RAFRAICHIR_NOTIFICATIONS, fetchTickets);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calcul des statistiques
  const nbATraiter = tickets.filter(t => t.statut === 'en_attente').length;
  const nbEnCours = tickets.filter(t => t.statut === 'en_cours').length;
  const nbResolu = tickets.filter(t => t.statut === 'resolu').length;
  const nbUrgents = tickets.filter(t => t.priorite === 'urgente').length;

  // Tri des tickets : les plus récents en haut
  const ticketsTries = [...tickets].sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());

  // Filtrage des tickets - SUPPRESSION DU FILTRE RESTRICTIF
  const ticketsFiltres = ticketsTries.filter(ticket => {
    // Filtres de recherche, catégorie, statut, priorité - AVEC GESTION DES UNDEFINED
    const matchSearch = !search ||
      (ticket.titre && ticket.titre.toLowerCase().includes(search.toLowerCase())) ||
      (ticket.idTicket && ticket.idTicket.toString().includes(search)) ||
      ((ticket.prenomUtilisateur || '') + ' ' + (ticket.nomUtilisateur || '')).toLowerCase().includes(search.toLowerCase());
    const matchCategorie = !categorie || ticket.categorie === categorie;
    const matchStatut = !statut || ticket.statut === statut;
    const matchPriorite = !priorite || ticket.priorite === priorite;
    return matchSearch && matchCategorie && matchStatut && matchPriorite;
  });

  // Catégories uniques
  const categories = Array.from(new Set(tickets.map(t => t.categorie).filter(Boolean)));

  function formatRelativeTime(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    const diffJ = Math.floor(diffH / 24);
    return `il y a ${diffJ}j`;
  }

  if (
    chargementUser || chargementTickets ||
    !user ||
    !((user.nom && user.prenom) || (user.nomUtilisateur && user.prenomUtilisateur))
  ) {
    return (
      <DashboardLayout role="directeur">
        <p className="text-sm text-slate-500 text-center py-16">Chargement des données...</p>
      </DashboardLayout>
    );
  }

  const statCards = [
    { label: 'À traiter', value: nbATraiter },
    { label: 'En cours', value: nbEnCours },
    { label: 'Résolus', value: nbResolu },
    { label: 'Urgents', value: nbUrgents },
  ];

  const prioriteOptions: { value: string; label: string }[] = [
    { value: '', label: 'Tous' },
    { value: 'normale', label: 'Normal' },
    { value: 'haute', label: 'Élevé' },
    { value: 'urgente', label: 'Urgent' },
  ];

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title="Tous les tickets"
        description="Gérez efficacement les tickets de support technique : priorisez, assignez et suivez la résolution."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</span>
              <div className="text-3xl font-semibold text-slate-900 mt-2">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un ticket, ID, description ou utilisateur..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Catégorie</label>
              <Select value={categorie} onChange={e => setCategorie(e.target.value)} className="w-auto min-w-[160px]">
                <option value="">Toutes catégories</option>
                {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Statut</label>
              <Select value={statut} onChange={e => setStatut(e.target.value)} className="w-auto min-w-[160px]">
                <option value="">Tous statuts</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="resolu">Résolu</option>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              {prioriteOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={priorite === opt.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPriorite(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        {chargement ? (
          <p className="text-sm text-slate-500 text-center py-16">Chargement des tickets...</p>
        ) : ticketsFiltres.length === 0 ? (
          <EmptyState
            title={tickets.length === 0 ? 'Aucun ticket disponible' : 'Aucun ticket avec ces filtres'}
            description={
              tickets.length === 0
                ? "Il n'y a actuellement aucun ticket dans le système."
                : `Il y a ${tickets.length} ticket(s) au total, mais aucun ne correspond aux filtres actifs.`
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium py-3 px-4">Ticket</th>
                  <th className="text-left font-medium py-3 px-4">Priorité</th>
                  <th className="text-left font-medium py-3 px-4">Statut</th>
                  <th className="text-left font-medium py-3 px-4">Assigné à</th>
                  <th className="text-left font-medium py-3 px-4">Créé</th>
                  <th className="text-right font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ticketsFiltres.map((ticket) => {
                  const isAssigned = !!ticket.nomTechnicien && !!ticket.prenomTechnicien;
                  const ticketNom = ticket.nomTechnicien;
                  const ticketPrenom = ticket.prenomTechnicien;
                  const userNom = user?.nom || user?.nomUtilisateur;
                  const userPrenom = user?.prenom || user?.prenomUtilisateur;

                  const isMine = isAssigned && userNom && userPrenom &&
                    normalize(ticketNom) === normalize(userNom) &&
                    normalize(ticketPrenom) === normalize(userPrenom);

                  return (
                    <tr
                      key={ticket.idTicket}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <PrioriteDot priorite={ticket.priorite} />
                          <span className="text-xs font-semibold text-brand-600">#{ticket.idTicket}</span>
                          {ticket.priorite === 'urgente' && <Zap size={13} className="text-red-500" />}
                          <MessagesNonLusBadge nombreMessages={ticket.nombreMessages} />
                        </div>
                        <div className="font-medium text-slate-900">{ticket.titre}</div>
                        <div className="text-xs text-slate-500">
                          {ticket.categorie || 'Non catégorisé'}
                          {ticket.nomEntreprise && <> · {ticket.nomEntreprise}</>}
                        </div>
                        {ticket.partagePar && (
                          <span className="inline-block mt-1 text-xs font-medium text-brand-700 bg-brand-50 rounded px-2 py-0.5">
                            Partagé par {ticket.partagePar}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4"><PrioriteBadge priorite={ticket.priorite} /></td>
                      <td className="py-3 px-4"><StatutBadge statut={ticket.statut} /></td>
                      <td className="py-3 px-4 text-slate-600">
                        {isAssigned ? `${ticket.prenomTechnicien} ${ticket.nomTechnicien}` : <span className="text-slate-400">Non assigné</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">{formatRelativeTime(ticket.dateCreation)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end flex-wrap">
                          {!isAssigned && ticket.statut === 'en_attente' && (
                            <Button size="sm" variant="secondary" icon={<UserPlus size={14} />} onClick={() => setSelectedTicket(ticket)}>
                              Assigner
                            </Button>
                          )}
                          {isAssigned && !isMine && (
                            <Button size="sm" variant="success" disabled>
                              {ticket.prenomTechnicien} {ticket.nomTechnicien}
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" icon={<ArrowUpRight size={14} />} onClick={() => router.push(`/directeur/ticket/${ticket.idTicket}`)}>
                            Voir
                          </Button>
                          {isMine && (
                            <Button size="sm" variant="primary" onClick={() => router.push(`/directeur/ticket/${ticket.idTicket}`)}>
                              Continuer
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} techniciens={techniciens} onAssigner={assignerTicketA} />
      )}
      <ToastContainer position="bottom-right" />
    </DashboardLayout>
  );
}
