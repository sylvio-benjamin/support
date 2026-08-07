'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Input, Select, Textarea } from '../../../components/ui/Input';
import Badge, { PrioriteBadge, StatutBadge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import { obtenirEnTeteCsrf } from '../../../lib/csrf';
import { Search, Eye, CheckCircle2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function MesTicketsTechnicien() {
  useAuthRedirect();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [statut, setStatut] = useState('');
  const [priorite, setPriorite] = useState('');
  const [dateMin, setDateMin] = useState('');
  const [dateMax, setDateMax] = useState('');
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [rapport, setRapport] = useState('');
  const [includeRapport, setIncludeRapport] = useState(false);
  const [clotureLoading, setClotureLoading] = useState(false);
  const [statutCloture, setStatutCloture] = useState<'resolu' | 'ferme'>('resolu');

  const chargerTickets = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/mesTickets.php`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTickets(data.tickets || []);
        }
        setChargement(false);
      });
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    chargerTickets();
  }, []);

  // Filtres dynamiques
  const ticketsFiltres = tickets.filter((ticket) => {
    const matchSearch =
      search === '' ||
      ticket.titre?.toLowerCase().includes(search.toLowerCase()) ||
      ticket.idTicket?.toString().includes(search) ||
      ticket.categorie?.toLowerCase().includes(search.toLowerCase());
    const matchCategorie = !categorie || categorie === 'Toutes catégories' || ticket.categorie === categorie;
    const matchStatut = !statut || statut === 'Tous statuts' || ticket.statut === statut;
    const matchPriorite = !priorite || priorite === 'Tous' || ticket.priorite === priorite.toLowerCase();
    // Filtrage par date
    const ticketDate = ticket.dateCreation ? ticket.dateCreation.split(' ')[0] : '';
    const matchDateMin = !dateMin || ticketDate >= dateMin;
    const matchDateMax = !dateMax || ticketDate <= dateMax;
    return matchSearch && matchCategorie && matchStatut && matchPriorite && matchDateMin && matchDateMax;
  });

  // Stats - Les tickets à traiter incluent maintenant tous les tickets partagés avec le statut 'en_attente'
  const nbATraiter = tickets.filter((t) => t.statut === 'en_attente').length;
  const nbEnCours = tickets.filter((t) => t.statut === 'en_cours').length;
  const nbResolu = tickets.filter((t) => t.statut === 'resolu').length;
  const nbUrgents = tickets.filter((t) => t.priorite === 'urgente').length;

  // Catégories dynamiques
  const categories = Array.from(new Set(tickets.map((t) => t.categorie).filter(Boolean)));

  // Fonctions d'action
  function handleContinuer(idTicket: number) {
    router.push(`/technicien/ticket/${idTicket}`);
  }

  function handleCloturer(idTicket: number) {
    setSelectedTicketId(idTicket);
    setShowClotureModal(true);
    setRapport('');
    setIncludeRapport(false);
    setStatutCloture('resolu');
  }

  const cloturerTicketAvecRapport = async () => {
    if (!selectedTicketId) return;

    setClotureLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fermerTicket.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...obtenirEnTeteCsrf(),
        },
        credentials: 'include',
        body: JSON.stringify({
          idTicket: selectedTicketId,
          reponse: statutCloture,
          rapport: includeRapport ? rapport : null,
        }),
      });

      const data = await response.json();
      if (data.succes) {
        chargerTickets();
        setShowClotureModal(false);
        setSelectedTicketId(null);
        setRapport('');
        setIncludeRapport(false);
      } else {
        toast.error('Erreur lors de la clôture du ticket : ' + (data.erreur || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      toast.error('Erreur lors de la clôture du ticket');
    } finally {
      setClotureLoading(false);
    }
  };

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

  const statCards = [
    { label: 'À traiter', value: nbATraiter },
    { label: 'En cours', value: nbEnCours },
    { label: 'Résolus', value: nbResolu },
    { label: 'Urgents', value: nbUrgents },
  ];

  const priorites = [
    { value: '', label: 'Tous' },
    { value: 'basse', label: 'Basse' },
    { value: 'normale', label: 'Normale' },
    { value: 'haute', label: 'Haute' },
    { value: 'urgente', label: 'Urgente' },
  ];

  return (
    <DashboardLayout role="technicien">
      <PageHeader title="Tickets à traiter" description="Gérez efficacement vos tickets de support technique : priorisez, assignez et résolvez." />

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
              placeholder="Rechercher un ticket, ID, description..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Catégorie</label>
              <Select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-48">
                <option>Toutes catégories</option>
                {categories.map((cat, i) => (
                  <option key={i}>{cat}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Statut</label>
              <Select value={statut} onChange={(e) => setStatut(e.target.value)} className="w-48">
                <option>Tous statuts</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="resolu">Résolu</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Date min</label>
              <Input type="date" value={dateMin} onChange={(e) => setDateMin(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Date max</label>
              <Input type="date" value={dateMax} onChange={(e) => setDateMax(e.target.value)} className="w-40" />
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
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500 text-center py-8">Chargement des tickets...</p>
          </CardBody>
        </Card>
      ) : ticketsFiltres.length === 0 ? (
        <Card>
          <EmptyState title="Aucun ticket trouvé" description="Aucun ticket ne correspond à vos critères actuels." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ticketsFiltres.map((ticket) => (
            <Card key={ticket.idTicket} className="flex flex-col">
              <CardBody className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded">#{ticket.idTicket}</span>
                  <span className="text-xs text-slate-400">{formatRelativeTime(ticket.dateCreation)}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2 leading-snug">{ticket.titre}</h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge tone="neutral">{ticket.categorie}</Badge>
                  {ticket.nomEntreprise && <Badge tone="neutral">{ticket.nomEntreprise}</Badge>}
                  <PrioriteBadge priorite={ticket.priorite} />
                  <StatutBadge statut={ticket.statut} />
                  {ticket.nomTechnicien && (
                    <Badge tone="info">
                      {ticket.prenomTechnicien} {ticket.nomTechnicien}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 mt-auto pt-3 flex-wrap">
                  {ticket.statut === 'en_cours' && (
                    <Button size="sm" variant="primary" onClick={() => handleContinuer(ticket.idTicket)}>
                      Continuer
                    </Button>
                  )}
                  {ticket.statut === 'en_cours' && (
                    <Button size="sm" variant="danger" icon={<CheckCircle2 size={14} />} onClick={() => handleCloturer(ticket.idTicket)}>
                      Clôturer
                    </Button>
                  )}
                  {ticket.statut !== 'en_cours' && (
                    <Button size="sm" variant="secondary" icon={<Eye size={14} />} onClick={() => router.push(`/technicien/ticket/${ticket.idTicket}`)}>
                      Voir
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Modale de clôture de ticket */}
      {showClotureModal && (
        <div
          className="fixed inset-0 z-[1000] bg-slate-900/40 flex items-center justify-center p-4"
          onClick={() => !clotureLoading && setShowClotureModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-5 text-center">Clôturer le ticket #{selectedTicketId}</h2>

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
                  setSelectedTicketId(null);
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

      <ToastContainer position="top-right" autoClose={4000} theme="light" />
    </DashboardLayout>
  );
}
