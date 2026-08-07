'use client';

import React, { useEffect, useState } from 'react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import {
  FileText,
  CheckCircle2,
  Lock,
  Timer,
  Search,
  AlertTriangle,
  Calendar,
  User,
  Folder,
  ClipboardList,
  Printer,
} from 'lucide-react';

interface Rapport {
  idTicketArchive: string;
  titre: string;
  description: string;
  statut: string;
  priorite: string;
  categorie: string;
  sousCategorie: string | null;
  dateCreation: string;
  dateTicketCloture: string;
  rapport: string | null;
  nomUtilisateur: string;
  prenomUtilisateur: string;
}

export default function RapportsTechnicien() {
  useAuthRedirect();
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [chargement, setChargement] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [categorie, setCategorie] = useState('');
  const [dateMin, setDateMin] = useState('');
  const [dateMax, setDateMax] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/mesRapports.php`, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRapports(data.rapports || []);
          setError(null);
        } else {
          setError(data.error || 'Erreur lors du chargement des rapports');
        }
        setChargement(false);
      })
      .catch((err) => {
        console.error('Erreur lors du chargement des rapports:', err);
        setError('Erreur lors du chargement des rapports');
        setChargement(false);
      });
  }, []);

  const rapportsFiltres = rapports.filter((r) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      search === '' ||
      r.titre?.toLowerCase().includes(searchLower) ||
      r.idTicketArchive?.toString().toLowerCase().includes(searchLower) ||
      r.categorie?.toLowerCase().includes(searchLower) ||
      r.rapport?.toLowerCase().includes(searchLower);
    const matchStatut = !statut || r.statut === statut;
    const matchCategorie = !categorie || r.categorie === categorie;
    const rapportDate = r.dateTicketCloture ? r.dateTicketCloture.split(' ')[0] : '';
    const matchDateMin = !dateMin || rapportDate >= dateMin;
    const matchDateMax = !dateMax || rapportDate <= dateMax;
    return matchSearch && matchStatut && matchCategorie && matchDateMin && matchDateMax;
  });

  const nbTotal = rapports.length;
  const nbResolu = rapports.filter((r) => r.statut === 'resolu').length;
  const nbFerme = rapports.filter((r) => r.statut === 'ferme').length;
  const tempsMoyen =
    rapports.length > 0
      ? rapports.reduce((total, r) => {
          const dateCreation = new Date(r.dateCreation);
          const dateCloture = new Date(r.dateTicketCloture);
          const diffTime = Math.abs(dateCloture.getTime() - dateCreation.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return total + diffDays;
        }, 0) / rapports.length
      : 0;

  function formatDate(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const exporterPDF = () => {
    const lignes = rapportsFiltres
      .map(
        (r) => `
      <tr>
        <td class="date-cell">${formatDate(r.dateTicketCloture)}</td>
        <td>#${r.idTicketArchive}</td>
        <td>${r.titre}</td>
        <td>${r.prenomUtilisateur} ${r.nomUtilisateur}</td>
        <td>${r.categorie || '-'}</td>
        <td>${r.statut === 'resolu' ? 'Résolu' : 'Fermé'}</td>
        <td>${(r.rapport || 'Aucun rapport').replace(/</g, '&lt;')}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Mes Rapports - LyovaTech Support</title>
        <style>
          @page { size: A4; margin: 16mm 14mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: Arial, sans-serif; margin: 0; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8e33ed; padding-bottom: 20px; }
          .header h1 { color: #8e33ed; margin: 0; font-size: 26px; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px; break-inside: avoid; }
          .stat-card { border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; text-align: center; background: #f8fafc; break-inside: avoid; }
          .stat-value { font-size: 26px; font-weight: bold; color: #1e293b; }
          .stat-label { font-size: 13px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; vertical-align: top; word-break: break-word; }
          th { background: #8e33ed; color: white; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .date-cell { font-weight: 600; color: #8e33ed; white-space: nowrap; }
          @media print {
            .header { break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Mes Rapports de Clôture</h1>
          <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-value">${nbTotal}</div><div class="stat-label">Total rapports</div></div>
          <div class="stat-card"><div class="stat-value">${nbResolu}</div><div class="stat-label">Résolus</div></div>
          <div class="stat-card"><div class="stat-value">${nbFerme}</div><div class="stat-label">Fermés</div></div>
          <div class="stat-card"><div class="stat-value">${tempsMoyen.toFixed(1)}j</div><div class="stat-label">Temps moyen</div></div>
        </div>
        <table>
          <thead>
            <tr><th>Clôturé le</th><th>Ticket</th><th>Titre</th><th>Client</th><th>Catégorie</th><th>Statut</th><th>Rapport</th></tr>
          </thead>
          <tbody>${lignes}</tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 800);
    }
  };

  const statCards = [
    { label: 'Rapports rédigés', value: chargement ? '...' : nbTotal, icon: <FileText size={18} /> },
    { label: 'Tickets résolus', value: chargement ? '...' : nbResolu, icon: <CheckCircle2 size={18} /> },
    { label: 'Tickets fermés', value: chargement ? '...' : nbFerme, icon: <Lock size={18} /> },
    { label: 'Temps moyen de traitement', value: chargement ? '...' : `${tempsMoyen.toFixed(1)}j`, icon: <Timer size={18} /> },
  ];

  return (
    <DashboardLayout role="technicien">
      <PageHeader
        title="Mes rapports"
        description="Retrouvez l'historique de vos rapports de clôture rédigés sur les tickets que vous avez traités."
      />

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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Search size={16} /> Filtres de recherche
            </h3>
            <Button variant="primary" size="sm" icon={<Printer size={14} />} onClick={exporterPDF}>
              Exporter PDF
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              type="text"
              placeholder="Rechercher par titre, ID, catégorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="resolu">Résolu</option>
              <option value="ferme">Fermé</option>
            </Select>
            <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              <option value="">Toutes catégories</option>
              {Array.from(new Set(rapports.map((r) => r.categorie).filter(Boolean))).map((cat, i) => (
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
          <ClipboardList size={16} /> Rapports de clôture
        </h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {rapportsFiltres.length} résultat{rapportsFiltres.length !== 1 ? 's' : ''}
        </span>
      </div>

      {chargement ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500 text-center py-8">Chargement des rapports...</p>
          </CardBody>
        </Card>
      ) : error ? (
        <Card>
          <EmptyState icon={<AlertTriangle size={22} />} title="Erreur de chargement" description={error} />
        </Card>
      ) : rapportsFiltres.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText size={22} />}
            title="Aucun rapport trouvé"
            description={
              rapports.length === 0
                ? "Vous n'avez pas encore clôturé de ticket avec un rapport."
                : 'Aucun rapport ne correspond à vos critères de recherche.'
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {rapportsFiltres.map((r) => (
            <Card key={r.idTicketArchive}>
              <CardBody>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded">#{r.idTicketArchive}</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> Clôturé le {formatDate(r.dateTicketCloture)}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{r.titre}</h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge tone={r.statut === 'resolu' ? 'success' : 'danger'}>{r.statut === 'resolu' ? 'Résolu' : 'Fermé'}</Badge>
                  <Badge tone="brand">
                    <User size={11} className="mr-1 inline" /> {r.prenomUtilisateur} {r.nomUtilisateur}
                  </Badge>
                  {r.categorie && (
                    <Badge tone="neutral">
                      <Folder size={11} className="mr-1 inline" /> {r.categorie}
                    </Badge>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                    <ClipboardList size={13} /> Rapport de clôture
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {r.rapport || 'Aucun rapport rédigé pour ce ticket.'}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
