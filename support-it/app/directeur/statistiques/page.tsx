'use client';

import React, { useState, useEffect } from 'react';
import GraphiqueEvolutionTickets from '../../../components/TicketEvolutionChart';
import { Building2, Sparkles, XCircle, BarChart3, TrendingUp, Trophy, Medal, Award, Download } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Input, Select } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { colors } from '../../../styles/tokens';

const onglets = [
  { id: 'general', label: 'Statistiques générales' },
  { id: 'technicians', label: 'Performance techniciens' },
  { id: 'comparison', label: 'Comparaison' }
];

export default function StatistiquesDirecteur() {
  const [ongletActif, setOngletActif] = useState<'general' | 'technicians' | 'comparison'>('general');
  const [periodeSelectionnee, setPeriodeSelectionnee] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [entreprisesSelectionnees, setEntreprisesSelectionnees] = useState<string[]>(['all']);
  const [donneesGraphique, setDonneesGraphique] = useState<any>(null);
  const [entreprises, setEntreprises] = useState<{idEntreprise: string, nomEntreprise: string}[]>([]);
  const [chargement, setChargement] = useState(false);
  const [statistiquesPeriode, setStatistiquesPeriode] = useState<any>(null);
  const [statistiquesGenerales, setStatistiquesGenerales] = useState<any>(null);
  const [chargementStats, setChargementStats] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [chargementTechniciens, setChargementTechniciens] = useState(false);
  const [techniciensCompares, setTechniciensCompares] = useState<string[]>([]);
  // Nouvelles variables pour la plage de dates personnalisée
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [afficherDatesPers, setAfficherDatesPers] = useState(false);

  // Charger les entreprises et statistiques au démarrage
  useEffect(() => {
    chargerEntreprises();
    chargerStatistiquesGenerales();
    chargerPerformanceTechniciens();
  }, []);

  const chargerPerformanceTechniciens = async () => {
    setChargementTechniciens(true);
    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/performanceTechniciens.php`, {
        credentials: 'include',
      });
      const donnees = await reponse.json();
      if (donnees.success) {
        setTechnicians(donnees.techniciens || []);
      }
    } catch (erreur) {
      console.error('Erreur lors du chargement de la performance des techniciens:', erreur);
    } finally {
      setChargementTechniciens(false);
    }
  };

  // Charger les données du graphique quand la période ou les entreprises changent
  useEffect(() => {
    chargerDonneesGraphique();
  }, [periodeSelectionnee, entreprisesSelectionnees, dateDebut, dateFin]);

  // Gérer l'affichage des champs de dates personnalisées
  useEffect(() => {
    setAfficherDatesPers(periodeSelectionnee === 'custom');
  }, [periodeSelectionnee]);

  const chargerEntreprises = async () => {
    try {
      console.log('🏢 Chargement des entreprises...');
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeEntreprises.php`, {
        credentials: 'include'
      });
      const donnees = await reponse.json();
      console.log('📊 Réponse API entreprises:', donnees);

      if (donnees.success) {
        setEntreprises(donnees.entreprises || []);
        console.log(`✅ ${donnees.entreprises?.length || 0} entreprises chargées`);
      } else {
        console.error('❌ Erreur API entreprises:', donnees.error);
      }
    } catch (erreur) {
      console.error('❌ Erreur lors du chargement des entreprises:', erreur);
    }
  };

  const chargerStatistiquesGenerales = async () => {
    setChargementStats(true);
    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/statistiquesDashboard.php`, {
        credentials: 'include'
      });
      const donnees = await reponse.json();
      if (donnees.success) {
        setStatistiquesGenerales(donnees);
      }
    } catch (erreur) {
      console.error('Erreur lors du chargement des statistiques:', erreur);
    } finally {
      setChargementStats(false);
    }
  };

  const chargerDonneesGraphique = async () => {
    setChargement(true);
    try {
      // Construire les paramètres pour l'API
      const entreprisesParam = entreprisesSelectionnees.includes('all')
        ? 'all'
        : entreprisesSelectionnees.join(',');

      let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/evolutionTicketsParPeriode.php?periode=${periodeSelectionnee}&entreprises=${entreprisesParam}`;

      // Ajouter les dates personnalisées si la période est 'custom'
      if (periodeSelectionnee === 'custom' && dateDebut && dateFin) {
        url += `&dateDebut=${dateDebut}&dateFin=${dateFin}`;
      }

      const reponse = await fetch(url, {
        credentials: 'include'
      });

      const donnees = await reponse.json();

      if (donnees.success) {
        // Adapter les données pour le graphique
        const donneesAdaptees = adapterDonneesPourGraphique(donnees);
        setDonneesGraphique(donneesAdaptees);
        setStatistiquesPeriode(donnees.statistiques);
      } else {
        console.error('Erreur API:', donnees.error);
        setDonneesGraphique(null);
        setStatistiquesPeriode(null);
      }
    } catch (erreur) {
      console.error('Erreur lors du chargement des données:', erreur);
      setDonneesGraphique(null);
      setStatistiquesPeriode(null);
    } finally {
      setChargement(false);
    }
  };

  const exporterPDF = async () => {
    try {
      // Construire les paramètres avec les filtres actuels
      const entreprisesParam = entreprisesSelectionnees.includes('all')
        ? 'all'
        : entreprisesSelectionnees.join(',');

      let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/exportStatistiquesPDF.php?periode=${periodeSelectionnee}&entreprises=${entreprisesParam}`;

      // Ajouter les dates personnalisées si nécessaire
      if (periodeSelectionnee === 'custom' && dateDebut && dateFin) {
        url += `&dateDebut=${dateDebut}&dateFin=${dateFin}`;
      }

      // Récupérer les données
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();

      // Récupérer les données d'évolution pour le graphique
      let evolutionData: any[] = [];
      try {
        let evolutionUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/evolutionTicketsParPeriode.php?periode=${periodeSelectionnee}&entreprises=${entreprisesParam}`;
        if (periodeSelectionnee === 'custom' && dateDebut && dateFin) {
          evolutionUrl += `&dateDebut=${dateDebut}&dateFin=${dateFin}`;
        }
        const evolutionResponse = await fetch(evolutionUrl, { credentials: 'include' });
        evolutionData = await evolutionResponse.json();
      } catch (error) {
        console.error('Erreur récupération données évolution:', error);
      }

      // Créer le contenu HTML pour le PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${data.titre}</title>
          <style>
            @page { size: A4; margin: 16mm 14mm; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              background: white;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #3d47c2;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #3d47c2;
              margin: 0;
              font-size: 28px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin-bottom: 30px;
              break-inside: avoid;
            }
            .stat-card {
              border: 2px solid #3d47c2;
              padding: 20px;
              border-radius: 12px;
              text-align: center;
              background: #3d47c2;
              color: white;
              break-inside: avoid;
            }
            .stat-value {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .stat-label {
              font-size: 16px;
              opacity: 0.9;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .table thead, .evolution-table thead {
              display: table-header-group;
            }
            .table tr, .evolution-table tr {
              break-inside: avoid;
            }
            .table th, .table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            .table th {
              background: #3d47c2;
              color: white;
              font-weight: 600;
            }
            .table tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .info-section {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .evolution-section {
              margin: 30px 0;
              page-break-inside: avoid;
            }
            .evolution-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .evolution-table th, .evolution-table td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: center;
              font-size: 14px;
            }
            .evolution-table th {
              background: #3d47c2;
              color: white;
              font-weight: 600;
            }
            .evolution-table tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .date-cell {
              font-weight: 600;
              color: #3d47c2;
            }
            .number-cell {
              font-weight: bold;
              font-size: 16px;
            }
            .chart-section {
              break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${data.titre}</h1>
            <p><strong>Période:</strong> ${data.periode.debut} - ${data.periode.fin}</p>
            <p><strong>Généré le:</strong> ${data.date_generation}</p>
          </div>

          <div class="info-section">
            <h3>Statistiques Générales</h3>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${data.statistiques.total_tickets || 0}</div>
              <div class="stat-label">Total Tickets</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${data.statistiques.tickets_en_attente || 0}</div>
              <div class="stat-label">En Attente</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${data.statistiques.tickets_en_cours || 0}</div>
              <div class="stat-label">En Cours</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${(data.statistiques.tickets_resolus || 0) + (data.statistiques.tickets_fermes || 0)}</div>
              <div class="stat-label">Résolus/Fermés</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${data.statistiques.tickets_urgents || 0}</div>
              <div class="stat-label">Urgents</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${data.statistiques.temps_moyen_resolution ? Math.round(data.statistiques.temps_moyen_resolution) + 'h' : 'N/A'}</div>
              <div class="stat-label">Temps Moyen Résolution</div>
            </div>
          </div>

          ${evolutionData && evolutionData.length > 0 ? `
          <div class="evolution-section">
            <div class="info-section">
              <h3>Évolution des Tickets</h3>
            </div>
            <table class="evolution-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Nouveaux</th>
                  <th>En Cours</th>
                  <th>Résolus</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${evolutionData.map((item: { date: any; nouveaux: any; en_cours: any; resolus: any; }) => `
                  <tr>
                    <td class="date-cell">${item.date}</td>
                    <td class="number-cell">${item.nouveaux || 0}</td>
                    <td class="number-cell">${item.en_cours || 0}</td>
                    <td class="number-cell">${item.resolus || 0}</td>
                    <td class="number-cell">${(item.nouveaux || 0) + (item.en_cours || 0) + (item.resolus || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${data.entreprises && data.entreprises.length > 0 ? `
          <div class="info-section">
            <h3>Répartition par Entreprise</h3>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Total Tickets</th>
                <th>Tickets Résolus</th>
                <th>Taux de Résolution</th>
              </tr>
            </thead>
            <tbody>
              ${data.entreprises.map((entreprise: { nomEntreprise: any; total_tickets: number; tickets_resolus: number; }) => `
                <tr>
                  <td>${entreprise.nomEntreprise}</td>
                  <td>${entreprise.total_tickets}</td>
                  <td>${entreprise.tickets_resolus}</td>
                  <td>${entreprise.total_tickets > 0 ? Math.round((entreprise.tickets_resolus / entreprise.total_tickets) * 100 * 10) / 10 + '%' : '0%'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
        </body>
        </html>
      `;

      // Capturer le canvas Chart.js s'il existe
      let chartImageData = '';
      try {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas) {
          // Recréer le canvas sur fond blanc pour l'export
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = canvas.width;
          exportCanvas.height = canvas.height;
          const ctx = exportCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            ctx.drawImage(canvas, 0, 0);
            chartImageData = exportCanvas.toDataURL('image/png');
          }
        }
      } catch (_e) { /* canvas non disponible */ }

      const chartSection = chartImageData ? `
        <div class="chart-section">
          <div class="info-section"><h3>Graphique d'évolution</h3></div>
          <div style="text-align:center; padding: 20px 0;">
            <img src="${chartImageData}" style="max-width:100%; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
          </div>
        </div>` : '';

      const fullHtml = htmlContent.replace('</body>', `${chartSection}</body>`);

      // Ouvrir dans un nouvel onglet pour impression/sauvegarde PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 800);
      }

    } catch (erreur) {
      console.error('Erreur lors de l\'export PDF:', erreur);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    }
  };

  const adapterDonneesPourGraphique = (donneesAPI: any) => {
    const libellePeriodeActuelle = {
      week: 'Semaine Actuelle',
      month: 'Mois Actuel',
      quarter: 'Trimestre Actuel',
      year: 'Année Actuelle',
      custom: 'Période Personnalisée'
    }[periodeSelectionnee] || 'Période Actuelle';

    const libellePeriodePrecedente = {
      week: 'Semaine Précédente',
      month: 'Mois Précédent',
      quarter: 'Trimestre Précédent',
      year: 'Année Précédente',
      custom: 'Période Précédente'
    }[periodeSelectionnee] || 'Période Précédente';

    return {
      etiquettes: donneesAPI.labels,
      jeuDeDonnees: [
        {
          libelle: libellePeriodeActuelle,
          donnees: donneesAPI.donnees.actuelle,
          couleurBordure: colors.brand[600],
          couleurFond: `${colors.brand[600]}1a`,
          remplir: true,
        },
        {
          libelle: libellePeriodePrecedente,
          donnees: donneesAPI.donnees.precedente,
          couleurBordure: colors.info[500],
          couleurFond: `${colors.info[500]}1a`,
          remplir: true,
        },
      ],
    };
  };

  const gererChangementEntreprise = (idEntreprise: string) => {
    console.log('🔄 Changement entreprise:', idEntreprise, 'État actuel:', entreprisesSelectionnees);

    if (idEntreprise === 'all') {
      // Cliquer sur "Toutes" sélectionne tout et désélectionne les individuelles
      setEntreprisesSelectionnees(['all']);
      console.log('✅ Sélection: Toutes les entreprises');
    } else {
      // Cliquer sur une entreprise individuelle
      const nouvelleSelection = [...entreprisesSelectionnees];

      // Si "all" est sélectionné, on le retire d'abord
      if (nouvelleSelection.includes('all')) {
        nouvelleSelection.splice(nouvelleSelection.indexOf('all'), 1);
      }

      // Toggle l'entreprise cliquée
      if (nouvelleSelection.includes(idEntreprise)) {
        // Déselectionner cette entreprise
        const index = nouvelleSelection.indexOf(idEntreprise);
        nouvelleSelection.splice(index, 1);
        console.log('➖ Entreprise désélectionnée:', idEntreprise);
      } else {
        // Sélectionner cette entreprise
        nouvelleSelection.push(idEntreprise);
        console.log('➕ Entreprise sélectionnée:', idEntreprise);
      }

      // Si aucune entreprise n'est sélectionnée, revenir à "all"
      const selectionFinale = nouvelleSelection.length === 0 ? ['all'] : nouvelleSelection;
      setEntreprisesSelectionnees(selectionFinale);
      console.log('🎯 Nouvelle sélection:', selectionFinale);
    }
  };

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title="Statistiques & analyses"
        description="Tableau de bord pour l'analyse des performances et des données système."
      />

      {/* Onglets */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {onglets.map((o) => (
          <Button
            key={o.id}
            variant={ongletActif === o.id ? 'primary' : 'secondary'}
            onClick={() => setOngletActif(o.id as any)}
          >
            {o.label}
          </Button>
        ))}
      </div>

      {/* Statistiques Générales */}
      {ongletActif === 'general' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              value={chargementStats ? '' : (statistiquesGenerales?.statistiques?.tickets?.total_tickets || '0')}
              label="Total des tickets"
              change={chargementStats ? '' : `${statistiquesGenerales?.statistiques?.tickets?.tickets_semaine || 0} cette semaine`}
              positive={true}
              loading={chargementStats}
            />
            <StatCard
              value={chargementStats ? '' : (statistiquesGenerales?.statistiques?.tickets?.tickets_en_cours || '0')}
              label="Tickets en cours"
              change={chargementStats ? '' : `${pourcentageSur(statistiquesGenerales?.statistiques?.tickets?.tickets_en_cours, statistiquesGenerales?.statistiques?.tickets?.total_tickets)}% du total`}
              positive={false}
              loading={chargementStats}
            />
            <StatCard
              value={chargementStats ? '' : (statistiquesGenerales?.statistiques?.tickets?.tickets_resolus || '0')}
              label="Tickets résolus"
              change={chargementStats ? '' : `${pourcentageSur(statistiquesGenerales?.statistiques?.tickets?.tickets_resolus, statistiquesGenerales?.statistiques?.tickets?.total_tickets)}% du total`}
              positive={true}
              loading={chargementStats}
            />
            <StatCard
              value={chargementStats ? '' : (statistiquesGenerales?.statistiques?.tickets?.tickets_urgents || '0')}
              label="Tickets urgents"
              change={chargementStats ? '' : `${statistiquesGenerales?.statistiques?.tickets?.tickets_en_retard || 0} en retard`}
              positive={false}
              loading={chargementStats}
            />
          </div>

          <Card className="mb-6">
            <CardHeader className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Évolution des tickets par période</h3>
              <div className="flex gap-2 items-center flex-wrap">
                <Select value={periodeSelectionnee} onChange={(e) => setPeriodeSelectionnee(e.target.value as any)} className="w-auto h-9">
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                  <option value="quarter">Ce trimestre</option>
                  <option value="year">Cette année</option>
                  <option value="custom">Période personnalisée</option>
                </Select>

                {afficherDatesPers && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[11px] font-semibold text-slate-500">Du</label>
                      <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="h-7 text-xs px-2" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[11px] font-semibold text-slate-500">Au</label>
                      <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="h-7 text-xs px-2" />
                    </div>
                  </div>
                )}

                {/* Filtre d'entreprises avec cases à cocher */}
                <div className="relative bg-slate-50 border border-slate-200 rounded-md p-3 min-w-[280px]">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                    <span className="flex items-center gap-1.5"><Building2 size={13} /> Entreprises</span>
                    <span className="text-[10px] text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                      {entreprises.length} trouvées
                    </span>
                  </div>

                  <label
                    onClick={() => gererChangementEntreprise('all')}
                    className={`flex items-center gap-2 mb-2 cursor-pointer text-sm px-2 py-1.5 rounded-md border ${
                      entreprisesSelectionnees.includes('all') ? 'bg-brand-50 border-brand-200' : 'border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={entreprisesSelectionnees.includes('all')}
                      onChange={(e) => { e.stopPropagation(); gererChangementEntreprise('all'); }}
                      className="accent-brand-600"
                    />
                    <strong className="text-slate-800 flex items-center gap-1.5 font-semibold">
                      <Sparkles size={13} /> Toutes les entreprises {entreprises.length > 0 && `(${entreprises.length})`}
                    </strong>
                  </label>

                  <div className="h-px bg-slate-200 my-2" />

                  <div className="max-h-[120px] overflow-y-auto flex flex-col gap-1">
                    {entreprises.length === 0 ? (
                      <div className="text-slate-400 text-xs italic text-center p-3 bg-white rounded border border-dashed border-slate-200">
                        {chargementStats ? (
                          'Chargement des entreprises...'
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <XCircle size={13} /> Aucune entreprise trouvée
                          </div>
                        )}
                      </div>
                    ) : (
                      entreprises.map(entreprise => (
                        <label
                          key={entreprise.idEntreprise}
                          onClick={() => gererChangementEntreprise(entreprise.idEntreprise)}
                          className={`flex items-center gap-2 cursor-pointer text-sm px-2 py-1.5 rounded-md border ${
                            entreprisesSelectionnees.includes(entreprise.idEntreprise) ? 'bg-brand-50 border-brand-200' : 'border-transparent hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={entreprisesSelectionnees.includes(entreprise.idEntreprise)}
                            onChange={(e) => { e.stopPropagation(); gererChangementEntreprise(entreprise.idEntreprise); }}
                            className="accent-brand-600"
                          />
                          <span className={entreprisesSelectionnees.includes(entreprise.idEntreprise) ? 'font-medium text-slate-900' : 'text-slate-600'}>
                            {entreprise.nomEntreprise}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <Button variant="secondary" icon={<Download size={14} />} onClick={exporterPDF}>Exporter PDF</Button>
              </div>
            </CardHeader>
            <CardBody>
              {/* Informations sur la sélection */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 bg-slate-50 rounded-md text-sm">
                <div className="text-slate-600 flex items-center gap-1.5">
                  <TrendingUp size={14} /> Période : <strong className="text-slate-900">
                    {periodeSelectionnee === 'week' ? 'Cette semaine' :
                     periodeSelectionnee === 'month' ? 'Ce mois' :
                     periodeSelectionnee === 'quarter' ? 'Ce trimestre' : 'Cette année'}
                  </strong>
                </div>
                <div className="text-slate-600 flex items-center gap-1.5 flex-wrap">
                  <Building2 size={14} /> Entreprises : <strong className="text-slate-900">
                    {entreprisesSelectionnees.includes('all')
                      ? `Toutes (${entreprises.length})`
                      : `${entreprisesSelectionnees.length} sélectionnée${entreprisesSelectionnees.length > 1 ? 's' : ''}`}
                  </strong>
                  {!entreprisesSelectionnees.includes('all') && entreprisesSelectionnees.length > 0 && (
                    <span className="text-slate-400 text-xs">
                      {entreprisesSelectionnees.map(id =>
                        entreprises.find(e => e.idEntreprise === id)?.nomEntreprise
                      ).filter(Boolean).slice(0, 2).join(', ')}
                      {entreprisesSelectionnees.length > 2 && ', ...'}
                    </span>
                  )}
                </div>
                {statistiquesPeriode && (
                  <div className="text-slate-600 flex items-center gap-1.5">
                    <BarChart3 size={14} /> Évolution : <strong className={statistiquesPeriode.evolution_pourcentage >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {statistiquesPeriode.evolution_pourcentage >= 0 ? '+' : ''}{statistiquesPeriode.evolution_pourcentage}%
                    </strong>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <PeriodCard
                  titre={statistiquesPeriode ? (
                    periodeSelectionnee === 'week' ? 'Cette Semaine' :
                    periodeSelectionnee === 'month' ? 'Ce Mois' :
                    periodeSelectionnee === 'quarter' ? 'Ce Trimestre' : 'Cette Année'
                  ) : 'Période Actuelle'}
                  valeur={statistiquesPeriode?.total_actuel?.toString() || (chargementStats ? '...' : '0')}
                />
                <PeriodCard
                  titre={statistiquesPeriode ? (
                    periodeSelectionnee === 'week' ? 'Semaine Précédente' :
                    periodeSelectionnee === 'month' ? 'Mois Précédent' :
                    periodeSelectionnee === 'quarter' ? 'Trimestre Précédent' : 'Année Précédente'
                  ) : 'Période Précédente'}
                  valeur={statistiquesPeriode?.total_precedent?.toString() || (chargementStats ? '...' : '0')}
                />
                <PeriodCard
                  titre="Évolution"
                  valeur={statistiquesPeriode ? `${statistiquesPeriode.evolution_pourcentage >= 0 ? '+' : ''}${statistiquesPeriode.evolution_pourcentage}%` : (chargementStats ? '...' : '0%')}
                />
                <PeriodCard
                  titre="Total Global"
                  valeur={chargementStats ? '...' : (statistiquesGenerales?.statistiques?.tickets?.total_tickets || '0')}
                />
              </div>

              {/* Graphique interactif */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4" style={{ height: 400 }}>
                {chargement ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-slate-500">
                    Chargement des données...
                  </div>
                ) : donneesGraphique ? (
                  <GraphiqueEvolutionTickets donnees={donneesGraphique} hauteur={360} />
                ) : (
                  <div className="h-full flex items-center justify-center gap-1.5 text-sm text-slate-500">
                    <BarChart3 size={16} /> Aucune donnée disponible
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Tickets résolus par période</h3>
                <Select className="w-auto h-9">
                  <option>7 derniers jours</option>
                  <option>30 derniers jours</option>
                  <option>90 derniers jours</option>
                </Select>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <PeriodCard titre="7 Derniers Jours" valeur={chargementStats ? '...' : (statistiquesGenerales?.statistiques?.tickets?.tickets_semaine || '0')} />
                  <PeriodCard titre="30 Derniers Jours" valeur={chargementStats ? '...' : (statistiquesGenerales?.statistiques?.tickets?.tickets_resolus || '0')} />
                  <PeriodCard titre="Urgents" valeur={chargementStats ? '...' : (statistiquesGenerales?.statistiques?.tickets?.tickets_urgents || '0')} />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Tickets fermés par période</h3>
                <Select className="w-auto h-9">
                  <option>7 derniers jours</option>
                  <option>30 derniers jours</option>
                  <option>90 derniers jours</option>
                </Select>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <PeriodCard titre="En Attente" valeur={chargementStats ? '...' : (statistiquesGenerales?.statistiques?.tickets?.tickets_en_attente || '0')} />
                  <PeriodCard titre="Résolus/Fermés" valeur={chargementStats ? '...' : (statistiquesGenerales?.statistiques?.tickets?.tickets_resolus || '0')} />
                  <PeriodCard titre="En Retard" valeur={chargementStats ? '...' : (statistiquesGenerales?.statistiques?.tickets?.tickets_en_retard || '0')} />
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* Performance Techniciens */}
      {ongletActif === 'technicians' && (
        <Card>
          <CardHeader className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Classement des techniciens</h3>
            <span className="text-xs text-slate-400">Toutes périodes confondues</span>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {chargementTechniciens ? (
              <p className="text-sm text-slate-500 text-center py-8">Chargement...</p>
            ) : technicians.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Aucun ticket archivé pour le moment.</p>
            ) : (
              technicians.map((tech, i) => (
                <div
                  key={tech.idTechnicien}
                  className="flex items-center justify-between bg-slate-50 rounded-md p-4"
                  style={{ borderLeft: i < 3 ? `4px solid ${['#f59e0b', '#94a3b8', '#b45309'][i]}` : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0">
                      {initiales(tech.prenomTechnicien, tech.nomTechnicien)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{tech.prenomTechnicien} {tech.nomTechnicien}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        {i === 0 && <Trophy size={12} className="text-amber-500" />}
                        {i === 1 && <Medal size={12} className="text-slate-400" />}
                        {i === 2 && <Award size={12} className="text-amber-700" />}
                        {tech.ticketsTraites} ticket{tech.ticketsTraites > 1 ? 's' : ''} traité{tech.ticketsTraites > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6 items-center">
                    <div className="text-center">
                      <div className="text-base font-semibold text-slate-900">{tech.ticketsResolus}</div>
                      <div className="text-[11px] uppercase text-slate-400">Résolus</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-semibold text-slate-900">{formaterDuree(tech.tempsMoyenHeures)}</div>
                      <div className="text-[11px] uppercase text-slate-400">Temps moy.</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-semibold text-slate-900">{tech.ticketsEnCours}</div>
                      <div className="text-[11px] uppercase text-slate-400">En cours</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {/* Comparaison */}
      {ongletActif === 'comparison' && (() => {
        const techniciensAffiches = techniciensCompares.length > 0
          ? technicians.filter((t) => techniciensCompares.includes(String(t.idTechnicien)))
          : technicians.slice(0, 3);

        return (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Comparaison entre techniciens</h3>
                <Select
                  multiple
                  className="w-auto h-20"
                  value={techniciensCompares}
                  onChange={(e) => setTechniciensCompares(Array.from(e.target.selectedOptions).map((o) => o.value))}
                >
                  {technicians.map((tech) => (
                    <option key={tech.idTechnicien} value={String(tech.idTechnicien)}>
                      {tech.prenomTechnicien} {tech.nomTechnicien}
                    </option>
                  ))}
                </Select>
              </CardHeader>
              <CardBody>
                {techniciensAffiches.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">Aucun technicien à comparer.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    {techniciensAffiches.map((tech, i) => (
                      <div key={tech.idTechnicien} className="bg-slate-50 rounded-md p-4">
                        <div className="text-sm text-slate-500 mb-1">{tech.prenomTechnicien} {tech.nomTechnicien}</div>
                        <div className="text-3xl font-semibold text-slate-900 mb-2">{tech.ticketsResolus}</div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${i === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          Tickets résolus
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-slate-900">Comparaison détaillée</h3>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                      <th className="text-left font-medium py-3 px-4">Technicien</th>
                      <th className="text-center font-medium py-3 px-4">Tickets résolus</th>
                      <th className="text-center font-medium py-3 px-4">Tickets fermés</th>
                      <th className="text-center font-medium py-3 px-4">Temps moyen</th>
                      <th className="text-center font-medium py-3 px-4">En cours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {techniciensAffiches.map((tech) => (
                      <tr key={tech.idTechnicien} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">{tech.prenomTechnicien} {tech.nomTechnicien}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{tech.ticketsResolus}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{tech.ticketsFermes}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{formaterDuree(tech.tempsMoyenHeures)}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{tech.ticketsEnCours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}

// Composants utilitaires
function StatCard({ value, label, change, positive, loading = false }: { value: string, label: string, change: string, positive?: boolean, loading?: boolean }) {
  return (
    <Card>
      <CardBody>
        {loading ? (
          <>
            <div className="w-20 h-9 bg-slate-100 rounded animate-pulse mb-2" />
            <div className="w-32 h-3.5 bg-slate-100 rounded animate-pulse mb-2" />
            <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
          </>
        ) : (
          <>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{value}</div>
            <div className="text-sm text-slate-500 mb-2">{label}</div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${positive === false ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {change}
            </span>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function PeriodCard({ titre, valeur }: { titre: string, valeur: string }) {
  return (
    <div className="bg-slate-50 rounded-md p-4 text-center">
      <h5 className="text-xs uppercase text-slate-500 mb-2">{titre}</h5>
      <div className="text-xl font-semibold text-slate-900">{valeur}</div>
      <div className="text-xs text-slate-400">créés</div>
    </div>
  );
}

function pourcentageSur(valeur: number | string | undefined, total: number | string | undefined): string {
  const t = Number(total);
  if (!t) return '0';
  return ((Number(valeur) / t) * 100).toFixed(1);
}

function initiales(prenom: string, nom: string): string {
  return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();
}

function formaterDuree(heures: number | string | null): string {
  const h = Number(heures);
  if (!h || Number.isNaN(h)) return '—';
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}j`;
}
