'use client';

import React, { useEffect, useState } from 'react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import { Package, BarChart3, CheckCircle2, Lock, Timer, AlertTriangle, MessageCircle, ClipboardList, RefreshCw, X } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Input, Select } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { StatutBadge, PrioriteBadge, Badge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';

export default function ArchivesDirecteur() {
  useAuthRedirect();
  const [archives, setArchives] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [statut, setStatut] = useState('');
  const [priorite, setPriorite] = useState('');
  const [dateMin, setDateMin] = useState('');
  const [dateMax, setDateMax] = useState('');

  // États pour le modal de rapport de clôture
  const [showRapportModal, setShowRapportModal] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/archivesTickets.php`, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setArchives(data.archives || []);
          setError(null);
        } else {
          setError(data.error || 'Erreur lors du chargement des archives');
        }
        setChargement(false);
      })
      .catch((error) => {
        console.error('Erreur lors du chargement des archives:', error);
        setError('Erreur lors du chargement des archives');
        setChargement(false);
      });
  }, []);

  // Filtres dynamiques
  const archivesFiltres = archives.filter(archive => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      search === '' ||
      archive.titre?.toLowerCase().includes(searchLower) ||
      archive.idTicketArchive?.toString().toLowerCase() === searchLower ||
      archive.idTicketArchive?.toString().toLowerCase().includes(searchLower) ||
      archive.categorie?.toLowerCase().includes(searchLower) ||
      archive.description?.toLowerCase().includes(searchLower);
    const matchCategorie = !categorie || categorie === 'Toutes catégories' || archive.categorie === categorie;
    const matchStatut = !statut || statut === 'Tous statuts' || archive.statut === statut;
    const matchPriorite = !priorite || priorite === 'Tous' || archive.priorite === priorite.toLowerCase();
    const archiveDate = archive.dateTicketCloture ? archive.dateTicketCloture.split(' ')[0] : '';
    const matchDateMin = !dateMin || archiveDate >= dateMin;
    const matchDateMax = !dateMax || archiveDate <= dateMax;
    return matchSearch && matchCategorie && matchStatut && matchPriorite && matchDateMin && matchDateMax;
  });

  // Stats
  const nbResolu = archives.filter(a => a.statut === 'resolu').length;
  const nbFerme = archives.filter(a => a.statut === 'ferme').length;
  const nbTotal = archives.length;
  const tempsMoyen = archives.length > 0 ?
    archives.reduce((total, archive) => {
      const dateCreation = new Date(archive.dateCreation);
      const dateCloture = new Date(archive.dateTicketCloture);
      const diffTime = Math.abs(dateCloture.getTime() - dateCreation.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return total + diffDays;
    }, 0) / archives.length : 0;

  const handleRouvrir = async (archiveId: string) => {
    if (confirm('Êtes-vous sûr de vouloir rouvrir ce ticket ?')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/rouvrirTicket.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ idTicketArchive: archiveId })
        });
        const data = await response.json();
        if (data.success) {
          // Mettre à jour l'état local au lieu de recharger la page
          setArchives(prevArchives => prevArchives.filter(archive => archive.idTicketArchive !== archiveId));
        } else {
          alert('Erreur lors de la réouverture du ticket : ' + (data.error || 'Erreur inconnue'));
        }
      } catch (error) {
        console.error('Erreur lors de la réouverture:', error);
        alert('Erreur lors de la réouverture du ticket');
      }
    }
  };

  const handleVoirConversation = (archive: any) => {
    window.location.href = `/directeur/archive-conversation/${archive.idTicketArchive}`;
  };

  const handleVoirRapport = (archive: any) => {
    setSelectedArchive(archive);
    setShowRapportModal(true);
  };

  function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  const statCards = [
    { label: 'Total archivés', value: nbTotal, icon: <BarChart3 size={18} /> },
    { label: 'Résolus', value: nbResolu, icon: <CheckCircle2 size={18} /> },
    { label: 'Fermés', value: nbFerme, icon: <Lock size={18} /> },
    { label: 'Temps moyen', value: `${tempsMoyen.toFixed(1)}j`, icon: <Timer size={18} /> },
  ];

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title="Archives des tickets"
        description="Historique complet des tickets résolus et fermés."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</span>
                <span className="w-8 h-8 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">{s.icon}</span>
              </div>
              <div className="text-3xl font-semibold text-slate-900">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              type="text"
              placeholder="Rechercher par titre, ID ou catégorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lg:col-span-3"
            />
            <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="resolu">Résolu</option>
              <option value="ferme">Fermé</option>
            </Select>
            <Select value={priorite} onChange={(e) => setPriorite(e.target.value)}>
              <option value="">Toutes priorités</option>
              <option value="urgent">Urgent</option>
              <option value="haute">Haute</option>
              <option value="normale">Normale</option>
              <option value="basse">Basse</option>
            </Select>
            <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              <option value="">Toutes catégories</option>
              {Array.from(new Set(archives.map(a => a.categorie).filter(Boolean))).map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </Select>
            <Input type="date" value={dateMin} onChange={(e) => setDateMin(e.target.value)} />
            <Input type="date" value={dateMax} onChange={(e) => setDateMax(e.target.value)} />
          </div>
        </CardBody>
      </Card>

      {/* Liste */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Package size={16} /> Tickets archivés
          </h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-3 py-1">
            {archivesFiltres.length} résultat{archivesFiltres.length !== 1 ? 's' : ''}
          </span>
        </div>

        {chargement ? (
          <p className="text-sm text-slate-500 text-center py-16">Chargement des archives...</p>
        ) : error ? (
          <EmptyState
            icon={<AlertTriangle size={22} />}
            title="Erreur de chargement"
            description={error}
            action={<Button variant="primary" onClick={() => window.location.reload()}>Réessayer</Button>}
          />
        ) : archivesFiltres.length === 0 ? (
          <EmptyState
            icon={<Package size={22} />}
            title={archives.length === 0 ? 'Pas de tickets archivés' : 'Aucun ticket trouvé'}
            description={
              archives.length === 0
                ? "Aucun ticket n'a encore été archivé."
                : 'Aucun ticket ne correspond à vos critères de recherche. Essayez de modifier vos filtres.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium py-3 px-4">Ticket</th>
                  <th className="text-left font-medium py-3 px-4">Statut</th>
                  <th className="text-left font-medium py-3 px-4">Utilisateur</th>
                  <th className="text-left font-medium py-3 px-4">Catégorie</th>
                  <th className="text-left font-medium py-3 px-4">Fermé le</th>
                  <th className="text-right font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {archivesFiltres.map((archive) => (
                  <tr key={archive.idTicketArchive} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-brand-600">#{archive.idTicketArchive}</span>
                        {archive.priorite === 'urgent' && <Badge tone="danger">Urgent</Badge>}
                      </div>
                      <div className="font-medium text-slate-900">{archive.titre}</div>
                      <div className="text-xs text-slate-500 max-w-md truncate">
                        {archive.description}
                      </div>
                      {archive.rapport && (
                        <div className="mt-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1 max-w-md">
                          <span className="font-medium text-slate-700">Rapport : </span>
                          {archive.rapport.length > 120 ? archive.rapport.substring(0, 120) + '...' : archive.rapport}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4"><StatutBadge statut={archive.statut} /></td>
                    <td className="py-3 px-4 text-slate-600">{archive.prenomUtilisateur} {archive.nomUtilisateur}</td>
                    <td className="py-3 px-4 text-slate-600">{archive.categorie}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">{formatDate(archive.dateTicketCloture)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button size="sm" variant="secondary" icon={<MessageCircle size={14} />} onClick={() => handleVoirConversation(archive)}>
                          Conversation
                        </Button>
                        {archive.rapport && (
                          <Button size="sm" variant="secondary" icon={<ClipboardList size={14} />} onClick={() => handleVoirRapport(archive)}>
                            Rapport
                          </Button>
                        )}
                        <Button size="sm" variant="success" icon={<RefreshCw size={14} />} onClick={() => handleRouvrir(archive.idTicketArchive)}>
                          Rouvrir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de rapport de clôture */}
      {showRapportModal && selectedArchive && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardList size={18} /> Rapport de clôture — Ticket #{selectedArchive.idTicketArchive}
              </h2>
              <button
                onClick={() => {
                  setShowRapportModal(false);
                  setSelectedArchive(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {selectedArchive.rapport}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
