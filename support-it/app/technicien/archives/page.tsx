'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Input';
import Badge, { PrioriteBadge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import {
  Package,
  BarChart3,
  CheckCircle2,
  Lock,
  Timer,
  Search,
  AlertTriangle,
  Calendar,
  User,
  Folder,
  ClipboardList,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';

export default function ArchivesTechnicien() {
  useAuthRedirect();
  const router = useRouter();
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

  const chargerArchives = () => {
    setChargement(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/archivesTickets.php`, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
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
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    chargerArchives();
  }, []);

  // Filtres dynamiques
  const archivesFiltres = archives.filter((archive) => {
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
  const nbResolu = archives.filter((a) => a.statut === 'resolu').length;
  const nbFerme = archives.filter((a) => a.statut === 'ferme').length;
  const nbTotal = archives.length;
  const tempsMoyen =
    archives.length > 0
      ? archives.reduce((total, archive) => {
          const dateCreation = new Date(archive.dateCreation);
          const dateCloture = new Date(archive.dateTicketCloture);
          const diffTime = Math.abs(dateCloture.getTime() - dateCreation.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return total + diffDays;
        }, 0) / archives.length
      : 0;

  const handleRouvrir = async (archiveId: string) => {
    if (confirm('Êtes-vous sûr de vouloir rouvrir ce ticket ?')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/rouvrirTicket.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ idTicketArchive: archiveId }),
        });
        const data = await response.json();
        if (data.success) {
          // Mettre à jour l'état local au lieu de recharger la page
          setArchives((prevArchives) => prevArchives.filter((archive) => archive.idTicketArchive !== archiveId));
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
    router.push(`/technicien/archive-conversation/${archive.idTicketArchive}`);
  };

  const handleVoirRapport = (archive: any) => {
    if (archive.rapport) {
      alert(archive.rapport);
    } else {
      alert('Aucun rapport de clôture disponible pour ce ticket.');
    }
  };

  function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  const statCards = [
    { label: 'Total archivés', value: nbTotal, icon: <BarChart3 size={18} /> },
    { label: 'Résolus', value: nbResolu, icon: <CheckCircle2 size={18} /> },
    { label: 'Fermés', value: nbFerme, icon: <Lock size={18} /> },
    { label: 'Temps moyen', value: `${tempsMoyen.toFixed(1)}j`, icon: <Timer size={18} /> },
  ];

  return (
    <DashboardLayout role="technicien">
      <PageHeader title="Archives des tickets" description="Explorez l'historique complet de vos tickets résolus et fermés." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      <Card className="mb-4">
        <CardBody className="flex flex-col gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Rechercher par titre, ID ou catégorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              {Array.from(new Set(archives.map((a) => a.categorie).filter(Boolean))).map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
            <Input type="date" value={dateMin} onChange={(e) => setDateMin(e.target.value)} />
            <Input type="date" value={dateMax} onChange={(e) => setDateMax(e.target.value)} />
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Package size={16} /> Tickets archivés
        </h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {archivesFiltres.length} résultat{archivesFiltres.length !== 1 ? 's' : ''}
        </span>
      </div>

      {chargement ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500 text-center py-8">Chargement des archives...</p>
          </CardBody>
        </Card>
      ) : error ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle size={22} />}
            title="Erreur de chargement"
            description={error}
            action={
              <Button variant="primary" onClick={chargerArchives}>
                Réessayer
              </Button>
            }
          />
        </Card>
      ) : archivesFiltres.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package size={22} />}
            title={archives.length === 0 ? 'Pas de tickets archivés' : 'Aucun ticket trouvé'}
            description={
              archives.length === 0
                ? "Aucun ticket n'a encore été archivé."
                : 'Aucun ticket ne correspond à vos critères de recherche. Essayez de modifier vos filtres.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archivesFiltres.map((archive) => (
            <Card key={archive.idTicketArchive} className="flex flex-col">
              <CardBody className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded">#{archive.idTicketArchive}</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> Fermé le {formatDate(archive.dateTicketCloture)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2 leading-snug">{archive.titre}</h3>
                <p className="text-sm text-slate-600 mb-3">
                  {archive.description && archive.description.length > 150
                    ? archive.description.substring(0, 150) + '...'
                    : archive.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge tone={archive.statut === 'resolu' ? 'success' : 'danger'}>
                    {archive.statut === 'resolu' ? 'Résolu' : 'Fermé'}
                  </Badge>
                  {archive.priorite === 'urgent' && <PrioriteBadge priorite="urgente" />}
                  <Badge tone="brand">
                    <User size={11} className="mr-1 inline" /> {archive.prenomUtilisateur} {archive.nomUtilisateur}
                  </Badge>
                  <Badge tone="neutral">
                    <Folder size={11} className="mr-1 inline" /> {archive.categorie}
                  </Badge>
                </div>

                {archive.rapport && (
                  <div className="bg-brand-50 border border-brand-100 rounded-md p-3 mb-3">
                    <p className="text-xs font-semibold text-brand-700 mb-1 flex items-center gap-1.5">
                      <ClipboardList size={13} /> Rapport de clôture
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {archive.rapport.length > 200 ? archive.rapport.substring(0, 200) + '...' : archive.rapport}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-auto pt-2 flex-wrap">
                  <Button size="sm" variant="secondary" icon={<MessageCircle size={14} />} onClick={() => handleVoirConversation(archive)}>
                    Voir conversation
                  </Button>
                  {archive.rapport && (
                    <Button size="sm" variant="secondary" icon={<ClipboardList size={14} />} onClick={() => handleVoirRapport(archive)}>
                      Voir rapport
                    </Button>
                  )}
                  <Button size="sm" variant="success" icon={<RefreshCw size={14} />} onClick={() => handleRouvrir(archive.idTicketArchive)}>
                    Rouvrir
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
