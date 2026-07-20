'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import { Building2, ClipboardList, Eye, Trash2, Plus, Search, X } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Input';
import Badge, { StatutBadge, PrioriteBadge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';

function parseDescription(desc: string) {
  const regex = /Problème rencontré *:([\s\S]*?)Actions déjà tentées *:([\s\S]*?)Impact *:([\s\S]*)/i;
  const match = desc.match(regex);
  if (match) {
    const probleme = match[1].trim();
    const actions = match[2].trim().split(/\n|\r|\r\n|\*/).map((a) => a.trim()).filter((a) => a);
    const impact = match[3].trim();
    return { probleme, actions, impact };
  }
  return { probleme: desc, actions: [], impact: '' };
}

function TicketModal({ ticket, onClose, onAssigner }: { ticket: any; onClose: () => void; onAssigner: (id: number) => void }) {
  if (!ticket) return null;
  let pieces: any[] = [];
  if (ticket.pieceJointe) {
    if (Array.isArray(ticket.pieceJointe)) pieces = ticket.pieceJointe;
    else if (typeof ticket.pieceJointe === 'string') pieces = ticket.pieceJointe.split(',').map((f) => f.trim()).filter(Boolean);
  }
  const desc = parseDescription(ticket.description || '');
  const dejaAssigne = !!(ticket.nomTechnicien && ticket.nomTechnicien !== '-' && ticket.nomTechnicien !== '');

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Ticket #{ticket.idTicket} — {ticket.titre}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="bg-slate-50 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-slate-900 mb-3">Informations</h3>
            <dl className="flex flex-col gap-2">
              <div className="flex justify-between"><dt className="text-slate-500">Créé par</dt><dd className="text-slate-900">{ticket.prenomUtilisateur} {ticket.nomUtilisateur}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Assigné à</dt><dd className="text-slate-900">{ticket.nomTechnicien || '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Créé le</dt><dd className="text-slate-900">{ticket.dateCreation ? ticket.dateCreation.split(' ')[0] : '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Catégorie</dt><dd className="text-slate-900">{ticket.categorie}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Service</dt><dd className="text-slate-900">{ticket.serviceConcerne}</dd></div>
            </dl>
            <div className="mt-3">
              <StatutBadge statut={ticket.statut} />
            </div>
            <Button
              variant="primary"
              size="sm"
              className="w-full mt-4"
              disabled={dejaAssigne}
              onClick={() => onAssigner(ticket.idTicket)}
            >
              {dejaAssigne ? 'Déjà assigné' : "S'assigner le ticket"}
            </Button>
          </div>
          <div className="text-sm">
            <h3 className="font-semibold text-slate-900 mb-3">Description du problème</h3>
            <p className="mb-3"><span className="font-medium">Problème rencontré :</span><br />{desc.probleme}</p>
            {desc.actions.length > 0 && (
              <div className="mb-3">
                <span className="font-medium">Actions déjà tentées :</span>
                <ul className="list-disc list-inside mt-1 text-slate-600">
                  {desc.actions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            {desc.impact && <p className="mb-3"><span className="font-medium">Impact :</span><br />{desc.impact}</p>}
            {pieces.length > 0 && (
              <div className="mt-4">
                <span className="font-medium">Pièces jointes :</span>
                <ul className="mt-2 flex flex-col gap-1">
                  {pieces.map((f, i) => (
                    <li key={i}>
                      <a href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                        {f.split('/').pop()}
                      </a>
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
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export default function TicketsTechnicien() {
  useAuthRedirect();
  const [tickets, setTickets] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  });
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [statut, setStatut] = useState('');
  const [priorite, setPriorite] = useState('');
  const [chargementUser, setChargementUser] = useState(true);
  const [filtrerParService, setFiltrerParService] = useState(true);
  const [chargementTickets, setChargementTickets] = useState(true);
  const router = useRouter();

  const fetchTickets = () => {
    setChargement(true);
    setChargementTickets(true);

    const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php`);
    if (filtrerParService) {
      url.searchParams.append('filtrerParService', 'true');
    }

    fetch(url.toString(), { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.success === false) {
          toast.error(data.error || 'Erreur lors de la récupération des tickets');
        }
        setTickets(data.tickets || []);
        setChargement(false);
        setChargementTickets(false);
      })
      .catch((error) => {
        console.error('Erreur fetch tickets:', error);
        toast.error('Erreur de réseau lors de la récupération des tickets');
        setChargement(false);
        setChargementTickets(false);
      });
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setChargementUser(false);
  }, []);

  useEffect(() => {
    if (user && ((user.nom && user.prenom) || (user.nomUtilisateur && user.prenomUtilisateur))) {
      fetchTickets();

      const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 5000,
      });

      socket.on('tickets_mis_a_jour', (nouveauxTickets) => setTickets(nouveauxTickets));
      socket.on('nouveau_ticket', (ticket) => {
        toast.info(`Nouveau ticket de ${ticket.prenomUtilisateur || ''} ${ticket.nomUtilisateur || ''} : ${ticket.titre || ''}`);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrerParService]);

  const assignerTicket = async (idTicket: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/assignerTicket.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idTicket }),
      });
      const data = await res.json();
      const ticket = tickets.find((t) => t.idTicket === idTicket);

      if (data.succes) {
        toast.success(`Vous êtes maintenant assigné à ce ticket : ${ticket ? ticket.titre : ''}`);
        fetchTickets();
        setSelectedTicket(null);
      } else {
        toast.error(data.erreur || "Erreur lors de l'assignation");
      }
    } catch (erreur) {
      console.error('Erreur assignation:', erreur);
      toast.error("Erreur de réseau lors de l'assignation");
    }
  };

  const supprimerTicket = async (idTicket: number, titreTicket?: string) => {
    if (!window.confirm(`Supprimer définitivement le ticket "${titreTicket || idTicket}" ? Cette action est irréversible.`)) {
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/supprimerTicket.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idTicket }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Ticket supprimé avec succès');
        fetchTickets();
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (erreur) {
      console.error('Erreur suppression:', erreur);
      toast.error('Erreur de réseau lors de la suppression');
    }
  };

  const nbATraiter = tickets.filter((t) => t.statut === 'en_attente').length;
  const nbEnCours = tickets.filter((t) => t.statut === 'en_cours').length;
  const nbResolu = tickets.filter((t) => t.statut === 'resolu').length;
  const nbUrgents = tickets.filter((t) => t.priorite === 'urgente').length;

  const ticketsTries = [...tickets].sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());

  const ticketsFiltres = ticketsTries.filter((ticket) => {
    const matchSearch =
      !search ||
      (ticket.titre && ticket.titre.toLowerCase().includes(search.toLowerCase())) ||
      (ticket.idTicket && ticket.idTicket.toString().includes(search)) ||
      ((ticket.prenomUtilisateur || '') + ' ' + (ticket.nomUtilisateur || '')).toLowerCase().includes(search.toLowerCase());
    const matchCategorie = !categorie || ticket.categorie === categorie;
    const matchStatut = !statut || ticket.statut === statut;
    const matchPriorite = !priorite || ticket.priorite === priorite;
    return matchSearch && matchCategorie && matchStatut && matchPriorite;
  });

  const categories = Array.from(new Set(tickets.map((t) => t.categorie).filter(Boolean)));

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

  if (chargementUser || chargementTickets || !user || !((user.nom && user.prenom) || (user.nomUtilisateur && user.prenomUtilisateur))) {
    return (
      <DashboardLayout role="technicien">
        <p className="text-slate-500 text-sm">Chargement des données...</p>
      </DashboardLayout>
    );
  }

  const statCards = [
    { label: 'À traiter', value: nbATraiter },
    { label: 'En cours', value: nbEnCours },
    { label: 'Résolus', value: nbResolu },
    { label: 'Urgents', value: nbUrgents },
  ];

  const priorites = [
    { value: '', label: 'Tous' },
    { value: 'normale', label: 'Normal' },
    { value: 'haute', label: 'Élevé' },
    { value: 'urgente', label: 'Urgent' },
  ];

  return (
    <DashboardLayout role="technicien">
      <PageHeader
        title={filtrerParService ? 'Tickets de mes services' : 'Tous les tickets'}
        description="Gérez, priorisez et assignez les tickets de support."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => router.push('/technicien/nouveau-ticket')}>
            Créer un ticket
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">{s.label}</p>
              <p className="text-3xl font-semibold text-slate-900">{s.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-col gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un ticket, ID, description ou utilisateur..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 mr-1">Affichage :</span>
            <Button size="sm" variant={filtrerParService ? 'primary' : 'secondary'} icon={<Building2 size={14} />} onClick={() => setFiltrerParService(true)}>
              Mes services
            </Button>
            <Button size="sm" variant={!filtrerParService ? 'primary' : 'secondary'} icon={<ClipboardList size={14} />} onClick={() => setFiltrerParService(false)}>
              Tous les tickets
            </Button>
          </div>

          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Catégorie</label>
              <Select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-48">
                <option value="">Toutes catégories</option>
                {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Statut</label>
              <Select value={statut} onChange={(e) => setStatut(e.target.value)} className="w-48">
                <option value="">Tous statuts</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="resolu">Résolu</option>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              {priorites.map((p) => (
                <Button key={p.value} size="sm" variant={priorite === p.value ? 'primary' : 'secondary'} onClick={() => setPriorite(p.value)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {chargement ? (
        <Card><CardBody><p className="text-sm text-slate-500 text-center py-8">Chargement des tickets...</p></CardBody></Card>
      ) : ticketsFiltres.length === 0 ? (
        <Card>
          <EmptyState
            title={tickets.length === 0 ? 'Aucun ticket disponible' : 'Aucun ticket avec ces filtres'}
            description={tickets.length === 0 ? "Il n'y a actuellement aucun ticket dans le système." : `${tickets.length} ticket(s) au total, mais aucun ne correspond à ces filtres.`}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ticketsFiltres.map((ticket) => {
            const isAssigned = !!ticket.nomTechnicien && !!ticket.prenomTechnicien;
            const userNom = user?.nom || user?.nomUtilisateur;
            const userPrenom = user?.prenom || user?.prenomUtilisateur;
            const isMine = isAssigned && userNom && userPrenom && normalize(ticket.nomTechnicien) === normalize(userNom) && normalize(ticket.prenomTechnicien) === normalize(userPrenom);

            return (
              <Card key={ticket.idTicket} className="hover:shadow-md transition-shadow cursor-pointer flex flex-col" onClick={() => setSelectedTicket(ticket)}>
                <CardBody className="flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded">#{ticket.idTicket}</span>
                    <span className="text-xs text-slate-400">{formatRelativeTime(ticket.dateCreation)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 leading-snug">{ticket.titre}</h3>
                  {ticket.creerParTechnicien && <Badge tone="success">Créé par un technicien</Badge>}
                  {ticket.partagePar && <Badge tone="brand">Partagé par {ticket.partagePar}</Badge>}
                  <div className="flex flex-wrap gap-1.5 my-3">
                    <Badge tone="neutral">{ticket.categorie || 'Non catégorisé'}</Badge>
                    <PrioriteBadge priorite={ticket.priorite} />
                    <StatutBadge statut={ticket.statut} />
                    {isAssigned && <Badge tone="info">{ticket.prenomTechnicien} {ticket.nomTechnicien}</Badge>}
                  </div>

                  <div className="flex gap-2 mt-auto pt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {!isAssigned && ticket.statut === 'en_attente' && (
                      <Button size="sm" variant="primary" onClick={() => assignerTicket(ticket.idTicket)}>Prendre en charge</Button>
                    )}
                    {isAssigned && !isMine && (
                      <Button size="sm" variant="success" disabled>Assigné à {ticket.prenomTechnicien}</Button>
                    )}
                    {isMine && (
                      <Button size="sm" variant="primary" onClick={() => router.push(`/technicien/ticket/${ticket.idTicket}`)}>Continuer</Button>
                    )}
                    <Button size="sm" variant="secondary" icon={<Eye size={14} />} onClick={() => router.push(`/technicien/ticket/${ticket.idTicket}`)}>Voir</Button>
                    {(!isAssigned || isMine) && (
                      <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => supprimerTicket(ticket.idTicket, ticket.titre)}>Supprimer</Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {selectedTicket && <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onAssigner={assignerTicket} />}
      <ToastContainer />
    </DashboardLayout>
  );
}
