'use client';

import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, RefreshCw, Calendar, Zap, Users, AlertTriangle, Ticket, ClipboardList, Loader2, BarChart3 } from 'lucide-react';
import DashboardLayout from '../../components/ui/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { StatutBadge, PrioriteBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { colors } from '../../styles/tokens';

// Fonction pour formater les nombres avec des espaces
const formaterNombre = (nombre: number) => {
  return nombre.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Camembert sobre en SVG (mêmes principes que le dashboard technicien)
function Camembert({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let acc = 0;
  const R = 76;
  const C = 96;

  const segments = data.map((d) => {
    const debut = acc;
    const val = d.value / total;
    acc += val;
    return { ...d, debutAngle: debut * 2 * Math.PI, finAngle: acc * 2 * Math.PI };
  });

  const decrireArc = (cx: number, cy: number, r: number, debut: number, fin: number) => {
    const x1 = cx + r * Math.cos(debut - Math.PI / 2);
    const y1 = cy + r * Math.sin(debut - Math.PI / 2);
    const x2 = cx + r * Math.cos(fin - Math.PI / 2);
    const y2 = cy + r * Math.sin(fin - Math.PI / 2);
    const grandArc = fin - debut > Math.PI ? 1 : 0;
    return [`M${cx},${cy}`, `L${x1},${y1}`, `A${r},${r} 0 ${grandArc} 1 ${x2},${y2}`, 'Z'].join(' ');
  };

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="192" height="192" viewBox="0 0 192 192" className="shrink-0">
        {segments.map((seg, i) => (
          <path key={i} d={decrireArc(C, C, R, seg.debutAngle, seg.finAngle)} fill={seg.color} stroke="#fff" strokeWidth={2} />
        ))}
      </svg>
      <div className="flex flex-col gap-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
            <span className="text-slate-600">{item.label}</span>
            <span className="font-semibold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [activitesRecentes, setActivitesRecentes] = useState<any[]>([]);
  const [dataStats, setDataStats] = useState<any>(null);
  const [derniereMAJ, setDerniereMAJ] = useState<Date>(new Date());

  useEffect(() => {
    const donneesUtilisateur = localStorage.getItem('user');
    if (donneesUtilisateur) {
      try {
        setUtilisateur(JSON.parse(donneesUtilisateur));
      } catch (error) {
        console.error('Erreur parsing utilisateur:', error);
        setErreur('Erreur lors du chargement des données utilisateur');
      }
    } else {
      setErreur('Utilisateur non connecté');
    }
  }, []);

  useEffect(() => {
    if (!utilisateur) return;
    chargerDonnees();

    const interval = setInterval(() => {
      chargerDonnees();
    }, 15000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        chargerDonnees();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [utilisateur]);

  const chargerDonnees = async () => {
    setChargement(true);
    setErreur('');

    try {
      let endpointStats = `${process.env.NEXT_PUBLIC_API_BASE_URL}/statistiquesDashboard.php`;
      if (utilisateur && (utilisateur.role === 'referent' || utilisateur.role === 'admin')) {
        endpointStats = `${process.env.NEXT_PUBLIC_API_BASE_URL}/statistiquesDashboardParEntreprise.php`;
      }

      const reponseStats = await fetch(endpointStats, { credentials: 'include' });
      const dataStats = await reponseStats.json();

      if (dataStats.success) {
        setDataStats(dataStats);
        // statistiquesDashboard.php renvoie ticketsRecents à la racine, mais
        // statistiquesDashboardParEntreprise.php (admin/referent) l'imbrique
        // sous statistiques.ticketsRecents — sans ce repli, la table
        // "Tickets récents" et le camembert restaient toujours vides pour
        // ces deux rôles.
        const ticketsRecents = dataStats.ticketsRecents || dataStats.statistiques?.ticketsRecents || [];
        setTickets(ticketsRecents);

        const statsTickets = dataStats.statistiques.tickets;

        if (dataStats.activitesRecentes && dataStats.activitesRecentes.length > 0) {
          const activitesRecentesMiseAJour = dataStats.activitesRecentes.map((activite: any, index: number) => {
            const getIconAndColor = (description: string, priorite?: string, statut?: string) => {
              if (description.includes('urgent')) {
                return { icon: AlertTriangle, tone: 'danger' as const };
              } else if (description.includes('résolu') || statut === 'resolu') {
                return { icon: CheckCircle2, tone: 'success' as const };
              } else {
                return { icon: Ticket, tone: 'brand' as const };
              }
            };

            const { icon, tone } = getIconAndColor(activite.description, activite.priorite, activite.statut);
            const timeDiff = Math.floor((Date.now() - new Date(activite.date).getTime()) / (1000 * 60));

            let timeText = '';
            if (timeDiff < 60) {
              timeText = `Il y a ${timeDiff} minutes`;
            } else if (timeDiff < 1440) {
              timeText = `Il y a ${Math.floor(timeDiff / 60)} heures`;
            } else {
              timeText = `Il y a ${Math.floor(timeDiff / 1440)} jours`;
            }

            return {
              icon,
              tone,
              text: `${activite.description} #${activite.idTicket} par ${activite.prenomUtilisateur} ${activite.nomUtilisateur}`,
              time: timeText,
            };
          });

          setActivitesRecentes(activitesRecentesMiseAJour);
        } else {
          const activitesBasiques = ticketsRecents.slice(0, 5).map((ticket: any) => ({
            icon: Ticket,
            tone: 'brand' as const,
            text: `Ticket #${ticket.idTicket} créé par ${ticket.prenomUtilisateur || ''} ${ticket.nomUtilisateur || ''}`,
            time: `Il y a ${Math.floor((Date.now() - new Date(ticket.dateCreation).getTime()) / (1000 * 60 * 60))} heures`,
          }));
          setActivitesRecentes(activitesBasiques);
        }

        void statsTickets;
      } else {
        console.error('Erreur statistiques:', dataStats.error);
        const reponseTickets = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php`, {
          credentials: 'include',
        });
        const dataTickets = await reponseTickets.json();
        if (dataTickets.success) {
          setTickets(dataTickets.tickets || []);
        } else {
          setTickets([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setErreur('Erreur de connexion au serveur');
      setTickets([]);
    } finally {
      setChargement(false);
      setDerniereMAJ(new Date());
    }
  };

  const stats = {
    totalTickets: tickets.length,
    ticketsEnAttente: dataStats?.statistiques?.tickets?.tickets_en_attente || 0,
    ticketsEnCours: dataStats?.statistiques?.tickets?.tickets_en_cours || 0,
    ticketsResolus: dataStats?.statistiques?.tickets?.tickets_resolus || 0,
    ticketsUrgents: dataStats?.statistiques?.tickets?.tickets_urgents || 0,
    ticketsEnRetard: dataStats?.statistiques?.tickets?.tickets_en_retard || 0,
  };

  const donneesCamembert = [
    { label: 'En attente', value: parseInt(stats.ticketsEnAttente as any) || 0, color: colors.warning[500] },
    { label: 'En cours', value: parseInt(stats.ticketsEnCours as any) || 0, color: colors.info[500] },
    { label: 'Résolus', value: parseInt(stats.ticketsResolus as any) || 0, color: colors.success[500] },
    { label: 'Fermés', value: tickets.filter(t => t.statut === 'ferme').length, color: colors.neutral[400] },
  ].filter(item => item.value > 0);

  const activitesRecentesParDefaut = [
    { icon: Ticket, tone: 'brand' as const, text: 'Chargement des activités...', time: 'En cours' },
  ];

  if (erreur) {
    return (
      <DashboardLayout role="admin">
        <div className="flex flex-col items-center justify-center text-center py-24">
          <AlertTriangle size={40} className="text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Erreur</h2>
          <p className="text-sm text-slate-500 mb-4">{erreur}</p>
          <Button variant="primary" icon={<RefreshCw size={16} />} onClick={() => window.location.reload()}>
            Recharger la page
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!utilisateur) {
    return (
      <DashboardLayout role="admin">
        <div className="flex flex-col items-center justify-center text-center py-24">
          <Loader2 size={40} className="animate-spin text-slate-400 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Chargement utilisateur...</h2>
          <p className="text-sm text-slate-500">Veuillez patienter pendant le chargement de vos données</p>
        </div>
      </DashboardLayout>
    );
  }

  const nomUtilisateur = `${utilisateur.prenom || utilisateur.prenomUtilisateur || ''} ${utilisateur.nom || utilisateur.nomUtilisateur || ''}`.trim();

  const quickStats = [
    { icon: Calendar, value: dataStats?.statistiques?.tickets?.tickets_semaine || 0, label: 'Nouveaux cette semaine' },
    { icon: Zap, value: stats.ticketsUrgents, label: 'Urgents' },
    { icon: Users, value: dataStats?.statistiques?.utilisateurs?.utilisateurs_actifs || 0, label: 'Employés actifs' },
  ];

  const statCards = [
    { label: 'En attente', value: stats.ticketsEnAttente, icon: <Clock size={18} /> },
    { label: 'Résolus / Fermés', value: stats.ticketsResolus, icon: <CheckCircle2 size={18} /> },
    { label: 'En cours', value: stats.ticketsEnCours, icon: <RefreshCw size={18} /> },
    { label: 'Nouveaux cette semaine', value: dataStats?.statistiques?.tickets?.tickets_semaine || 0, icon: <Calendar size={18} /> },
  ];

  const ticketsUrgentsListe = tickets.filter(t => t.priorite === 'urgente').slice(0, 5);

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={`Bonjour, ${nomUtilisateur}`}
        description="Voici un aperçu de l'activité de votre équipe aujourd'hui."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Dernière mise à jour : {derniereMAJ.toLocaleTimeString('fr-FR')}</span>
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} className={chargement ? 'animate-spin' : ''} />}
              onClick={() => {
                setChargement(true);
                chargerDonnees();
              }}
            >
              Rafraîchir
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {quickStats.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><s.icon size={18} /></span>
              <div>
                <div className="text-xl font-semibold text-slate-900">{formaterNombre(s.value)}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {chargement && !dataStats ? (
        <div className="text-center text-slate-500 py-16">Chargement des données...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {statCards.map((s) => (
                <Card key={s.label}>
                  <CardBody>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</span>
                      <span className="w-8 h-8 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">{s.icon}</span>
                    </div>
                    <div className="text-3xl font-semibold text-slate-900">{formaterNombre(s.value)}</div>
                  </CardBody>
                </Card>
              ))}
            </div>

            <Card className="h-fit">
              <CardHeader>
                <h3 className="text-sm font-semibold text-slate-900">Activité récente</h3>
              </CardHeader>
              <CardBody className="flex flex-col">
                {(activitesRecentes.length > 0 ? activitesRecentes : activitesRecentesParDefaut).map((activite, index) => (
                  <div key={index} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      activite.tone === 'danger' ? 'bg-red-50 text-red-600' :
                      activite.tone === 'success' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-brand-50 text-brand-600'
                    }`}>
                      <activite.icon size={14} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 leading-snug">{activite.text}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{activite.time}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="flex items-center gap-2">
                <BarChart3 size={16} className="text-brand-600" />
                <h3 className="text-sm font-semibold text-slate-900">Répartition des tickets</h3>
              </CardHeader>
              <CardBody>
                {donneesCamembert.length > 0 ? (
                  <Camembert data={donneesCamembert} />
                ) : (
                  <div className="text-center text-slate-500 py-10">Aucune donnée disponible</div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="text-sm font-semibold text-slate-900">Tickets urgents</h3>
              </CardHeader>
              <CardBody>
                {ticketsUrgentsListe.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {ticketsUrgentsListe.map((ticket, index) => (
                      <div key={ticket.idTicket || index} className="flex items-center gap-3 p-3 rounded-md bg-slate-50">
                        <span className="w-1 h-9 rounded-full bg-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{ticket.titre || 'Ticket sans titre'}</p>
                          <p className="text-xs text-slate-500">{ticket.prenomUtilisateur || ''} {ticket.nomUtilisateur || ''}</p>
                        </div>
                        <PrioriteBadge priorite="urgente" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<CheckCircle2 size={22} />} title="Aucun ticket urgent" />
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Tickets récents</h3>
              <a href="/admin/mes-tickets" className="text-sm font-medium text-brand-600 hover:text-brand-700">Voir tout</a>
            </CardHeader>
            {tickets.length === 0 ? (
              <EmptyState icon={<ClipboardList size={22} />} title="Aucun ticket trouvé" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                      <th className="text-left font-medium px-5 py-3">ID</th>
                      <th className="text-left font-medium px-5 py-3">Titre</th>
                      <th className="text-left font-medium px-5 py-3">Utilisateur</th>
                      <th className="text-left font-medium px-5 py-3">Priorité</th>
                      <th className="text-left font-medium px-5 py-3">Statut</th>
                      <th className="text-left font-medium px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.slice(0, 10).map((ticket, index) => (
                      <tr key={ticket.idTicket || index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">#{ticket.idTicket}</td>
                        <td className="px-5 py-3 text-slate-700">{ticket.titre || 'Ticket sans titre'}</td>
                        <td className="px-5 py-3 text-slate-600">{ticket.prenomUtilisateur || ''} {ticket.nomUtilisateur || ''}</td>
                        <td className="px-5 py-3"><PrioriteBadge priorite={ticket.priorite} /></td>
                        <td className="px-5 py-3"><StatutBadge statut={ticket.statut} /></td>
                        <td className="px-5 py-3 text-slate-500">{new Date(ticket.dateCreation).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
