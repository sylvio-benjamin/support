'use client';

import React, { useEffect, useState } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PieController,
  Title,
  PointElement,
  LineElement,
} from 'chart.js';
import { CheckCircle2, PlusCircle, XCircle, ClipboardList, Check, Clock } from 'lucide-react';
import DashboardLayout from '../../components/ui/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { colors } from '../../styles/tokens';
import { ticketService } from '../../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, BarController, PieController, Title, PointElement, LineElement);

const pieOptions = {
  plugins: {
    legend: {
      display: false,
    },
  },
  responsive: true,
  maintainAspectRatio: false,
};

const barOptions = {
  plugins: {
    legend: { display: false },
    title: { display: false },
  },
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: colors.neutral[100] }, beginAtZero: true, ticks: { stepSize: 1 } },
  },
};

const TONE_CLASSES: Record<'success' | 'info' | 'neutral', string> = {
  success: 'bg-emerald-50 text-emerald-600',
  info: 'bg-blue-50 text-blue-600',
  neutral: 'bg-slate-100 text-slate-500',
};

function formaterDateCourte(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Compte, pour chaque jour de la semaine en cours (Lun..Dim), le nombre de
// tickets créés à cette date (à partir des dates de création fournies).
function repartitionParJourSemaine(dates: string[]): number[] {
  const compteurs = [0, 0, 0, 0, 0, 0, 0];
  const maintenant = new Date();
  const jourActuel = (maintenant.getDay() + 6) % 7; // 0 = lundi
  const lundi = new Date(maintenant);
  lundi.setDate(maintenant.getDate() - jourActuel);
  lundi.setHours(0, 0, 0, 0);
  const lundiSuivant = new Date(lundi);
  lundiSuivant.setDate(lundi.getDate() + 7);

  dates.forEach((dateStr) => {
    if (!dateStr) return;
    const date = new Date(dateStr.replace(' ', 'T'));
    if (date >= lundi && date < lundiSuivant) {
      compteurs[(date.getDay() + 6) % 7]++;
    }
  });
  return compteurs;
}

export default function Dashboard() {
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [archives, setArchives] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUtilisateur(JSON.parse(userData));
  }, []);

  useEffect(() => {
    const chargerDonnees = async () => {
      setChargement(true);
      try {
        const [ticketsRes, archivesRes] = await Promise.all([
          ticketService.getAllTickets(),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/archivesTicketsEmploye.php`, { credentials: 'include' }).then((r) => r.json()),
        ]);
        if (ticketsRes.success) setTickets(ticketsRes.tickets || []);
        if (archivesRes.success) setArchives(archivesRes.archives || []);
      } catch (erreur) {
        console.error('Erreur lors du chargement du tableau de bord:', erreur);
      } finally {
        setChargement(false);
      }
    };
    chargerDonnees();
  }, []);

  const prenomUtilisateur = utilisateur ? utilisateur.prenom || utilisateur.prenomUtilisateur || '' : '';

  const enAttente = tickets.filter((t) => t.statut === 'en_attente' || t.statut === 'en_cours').length;
  const resolu = archives.filter((a) => a.statut === 'resolu').length;
  const ferme = archives.filter((a) => a.statut === 'ferme').length;
  const total = enAttente + resolu + ferme;

  const statsTickets = { enAttente, resolu, ferme, total };

  const pieData = {
    labels: ['En attente', 'Résolu', 'Fermé'],
    datasets: [
      {
        data: [statsTickets.enAttente, statsTickets.resolu, statsTickets.ferme],
        backgroundColor: [colors.warning[500], colors.success[500], colors.neutral[400]],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const datesCreation = [...tickets.map((t) => t.dateCreation), ...archives.map((a) => a.dateCreation)];
  const barData = {
    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    datasets: [
      {
        label: 'Tickets créés',
        data: repartitionParJourSemaine(datesCreation),
        backgroundColor: colors.brand[500],
        borderRadius: 4,
        barThickness: 24,
      },
    ],
  };

  const activites = [
    ...tickets.map((t) => ({
      titre: `Nouveau ticket : ${t.titre}`,
      date: t.dateCreation,
      icon: <PlusCircle size={18} />,
      tone: 'info' as const,
    })),
    ...archives.map((a) => ({
      titre: a.statut === 'resolu' ? `Ticket résolu : ${a.titre}` : `Ticket fermé : ${a.titre}`,
      date: a.dateTicketCloture,
      icon: a.statut === 'resolu' ? <CheckCircle2 size={18} /> : <XCircle size={18} />,
      tone: (a.statut === 'resolu' ? 'success' : 'neutral') as 'success' | 'neutral',
    })),
  ]
    .filter((a) => a.date)
    .sort((a, b) => new Date(b.date.replace(' ', 'T')).getTime() - new Date(a.date.replace(' ', 'T')).getTime())
    .slice(0, 5);

  const statCards = [
    { label: 'Total tickets', value: statsTickets.total, sub: 'Tous statuts confondus', icon: <ClipboardList size={18} /> },
    { label: 'Tickets résolus', value: statsTickets.resolu, sub: 'Archivés à ce jour', icon: <Check size={18} /> },
    { label: 'Tickets en attente', value: statsTickets.enAttente, sub: 'En attente de traitement', icon: <Clock size={18} /> },
  ];

  return (
    <DashboardLayout role="employe">
      <PageHeader
        title={`Bonjour, ${prenomUtilisateur} !`}
        description="Bienvenue sur votre tableau de bord employé."
        actions={
          <Button variant="primary" icon={<PlusCircle size={16} />} onClick={() => (window.location.href = '/employe/ticket?nouveau=1')}>
            Créer un ticket
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</span>
                <span className="w-8 h-8 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">{s.icon}</span>
              </div>
              <div className="text-3xl font-semibold text-slate-900">{chargement ? '...' : s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.sub}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Répartition des tickets</h3>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="h-44 w-44 shrink-0">
                <Pie data={pieData} options={pieOptions} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colors.warning[500] }} />
                  <span className="text-slate-600">En attente</span>
                  <span className="font-semibold text-slate-900">{statsTickets.enAttente}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colors.success[500] }} />
                  <span className="text-slate-600">Résolu</span>
                  <span className="font-semibold text-slate-900">{statsTickets.resolu}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colors.neutral[400] }} />
                  <span className="text-slate-600">Fermé</span>
                  <span className="font-semibold text-slate-900">{statsTickets.ferme}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Tickets créés cette semaine</h3>
          </CardHeader>
          <CardBody>
            <div className="h-44">
              <Bar data={barData} options={barOptions} />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900">Activité récente</h3>
        </CardHeader>
        <CardBody className="flex flex-col gap-1">
          {chargement ? (
            <p className="text-sm text-slate-500 text-center py-6">Chargement...</p>
          ) : activites.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Aucune activité récente.</p>
          ) : (
            activites.map((act, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-b-0">
                <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${TONE_CLASSES[act.tone]}`}>
                  {act.icon}
                </span>
                <span className="text-sm font-medium text-slate-900 flex-1">{act.titre}</span>
                <span className="text-xs text-slate-500">{formaterDateCourte(act.date)}</span>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}
