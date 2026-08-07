'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { BarChart3, Check, Clock, AlertTriangle, ClipboardList, FileText } from 'lucide-react';
import DashboardLayout from '../../components/ui/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';

const COULEURS = ['#8e33ed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TableauDeBordTechnicien() {
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [statistiques, setStatistiques] = useState({ total: 0, enCours: 0, resolu: 0, nonAssigne: 0 });
  const [modeCamembert, setModeCamembert] = useState<'statut' | 'technicien'>('statut');
  const [partSurvolee, setPartSurvolee] = useState<number | null>(null);
  const [connexionWebSocket, setConnexionWebSocket] = useState<'connecte' | 'deconnecte' | 'connexion'>('connexion');
  const socketRef = useRef<Socket | null>(null);

  const recupererTickets = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTicket.php`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.tickets) {
          setTickets(data.tickets);
          setStatistiques({
            total: data.tickets.length,
            enCours: data.tickets.filter((t: any) => t.statut === 'en_cours').length,
            resolu: data.tickets.filter((t: any) => t.statut === 'resolu').length,
            nonAssigne: data.tickets.filter((t: any) => !t.idTechnicien).length,
          });
        }
      })
      .catch((err) => console.error('Erreur lors de la récupération des tickets:', err));
  };

  useEffect(() => {
    const donneesUtilisateur = localStorage.getItem('user');
    if (donneesUtilisateur) setUtilisateur(JSON.parse(donneesUtilisateur));

    recupererTickets();

    const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    socketInstance.on('connect', () => setConnexionWebSocket('connecte'));
    socketInstance.on('disconnect', () => setConnexionWebSocket('deconnecte'));
    socketInstance.on('connect_error', () => setConnexionWebSocket('deconnecte'));

    socketInstance.on('tickets_mis_a_jour', (nouveauxTickets) => {
      setTickets(nouveauxTickets);
      setStatistiques({
        total: nouveauxTickets.length,
        enCours: nouveauxTickets.filter((t: any) => t.statut === 'en_cours').length,
        resolu: nouveauxTickets.filter((t: any) => t.statut === 'resolu').length,
        nonAssigne: nouveauxTickets.filter((t: any) => !t.idTechnicien).length,
      });
    });
    socketInstance.on('nouveau_ticket', (nouveauTicket) => {
      setTickets((prev) => [...prev, nouveauTicket]);
    });
    socketInstance.on('statut_modifie', (ticketModifie) => {
      setTickets((prev) => prev.map((t) => (t.id === ticketModifie.id ? ticketModifie : t)));
    });

    socketRef.current = socketInstance;
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Tickets créés cette semaine, par jour
  const jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const maintenant = new Date();
  const jourActuel = maintenant.getDay();
  const joursDepuisLundi = jourActuel === 0 ? 6 : jourActuel - 1;
  const lundi = new Date(maintenant);
  lundi.setDate(maintenant.getDate() - joursDepuisLundi);
  lundi.setHours(0, 0, 0, 0);
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  dimanche.setHours(23, 59, 59, 999);

  const valeursBarres: number[] = Array(7).fill(0);
  tickets.forEach((ticket) => {
    if (ticket.dateCreation) {
      const date = new Date(ticket.dateCreation);
      if (date >= lundi && date <= dimanche) {
        let indexJour = date.getDay() - 1;
        if (indexJour === -1) indexJour = 6;
        valeursBarres[indexJour]++;
      }
    }
  });
  const maxBarre = Math.max(...valeursBarres, 1);

  const camembertStatut = [
    { libelle: 'En attente', valeur: tickets.filter((t) => t.statut === 'en_attente').length, couleur: COULEURS[0] },
    { libelle: 'En cours', valeur: statistiques.enCours, couleur: COULEURS[1] },
    { libelle: 'Résolu', valeur: statistiques.resolu, couleur: COULEURS[2] },
    { libelle: 'Fermé', valeur: tickets.filter((t) => t.statut === 'ferme').length, couleur: COULEURS[3] },
  ];
  const totalCamembertStatut = camembertStatut.reduce((s, d) => s + d.valeur, 0);

  let camembertTechnicien: { libelle: string; valeur: number; couleur: string }[] = [];
  if (modeCamembert === 'technicien' && tickets.length > 0) {
    const techniciens: Record<string, { nom: string; valeur: number }> = {};
    tickets.forEach((t) => {
      const nom = t.nomTechnicien && t.prenomTechnicien ? `${t.prenomTechnicien} ${t.nomTechnicien}` : 'Non assigné';
      if (!techniciens[nom]) techniciens[nom] = { nom, valeur: 0 };
      techniciens[nom].valeur++;
    });
    camembertTechnicien = Object.values(techniciens).map((t, i) => ({
      libelle: t.nom,
      valeur: t.valeur,
      couleur: COULEURS[i % COULEURS.length],
    }));
  }
  const totalCamembertTechnicien = camembertTechnicien.reduce((s, d) => s + d.valeur, 0);

  function getSegmentsCamembert(donnees: { valeur: number; couleur: string; libelle: string }[]) {
    const total = donnees.reduce((s, d) => s + d.valeur, 0) || 1;
    let acc = 0;
    return donnees.map((d) => {
      const debut = acc;
      const val = d.valeur / total;
      acc += val;
      return { couleur: d.couleur, valeur: d.valeur, libelle: d.libelle, debutAngle: debut * 2 * Math.PI, finAngle: acc * 2 * Math.PI };
    });
  }
  function decrireArc(cx: number, cy: number, r: number, debut: number, fin: number) {
    const x1 = cx + r * Math.cos(debut - Math.PI / 2);
    const y1 = cy + r * Math.sin(debut - Math.PI / 2);
    const x2 = cx + r * Math.cos(fin - Math.PI / 2);
    const y2 = cy + r * Math.sin(fin - Math.PI / 2);
    const grandArc = fin - debut > Math.PI ? 1 : 0;
    return [`M${cx},${cy}`, `L${x1},${y1}`, `A${r},${r} 0 ${grandArc} 1 ${x2},${y2}`, 'Z'].join(' ');
  }
  function positionLabelCamembert(cx: number, cy: number, r: number, debut: number, fin: number) {
    const angle = (debut + fin) / 2 - Math.PI / 2;
    const rLabel = r * 0.62;
    return { x: cx + rLabel * Math.cos(angle), y: cy + rLabel * Math.sin(angle) };
  }
  function renderCamembert(donnees: { valeur: number; couleur: string; libelle: string }[]) {
    const R = 76;
    const C = 96;
    const segments = getSegmentsCamembert(donnees);
    return segments.map((seg, i) => {
      const survole = partSurvolee === i;
      const { x, y } = positionLabelCamembert(C, C, survole ? R + 6 : R, seg.debutAngle, seg.finAngle);
      return (
        <g key={i}>
          <path
            d={decrireArc(C, C, survole ? R + 6 : R, seg.debutAngle, seg.finAngle)}
            fill={seg.couleur}
            stroke="#fff"
            strokeWidth={2}
            style={{ cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={() => setPartSurvolee(i)}
            onMouseLeave={() => setPartSurvolee(null)}
          />
          {seg.valeur > 0 && (
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={700} fill="#fff" style={{ pointerEvents: 'none' }}>
              {seg.valeur}
            </text>
          )}
        </g>
      );
    });
  }

  const dateActuelle = new Date();
  const jourSemaine = dateActuelle.getDay();
  const joursEcoules = jourSemaine === 0 ? 6 : jourSemaine - 1;
  const lundiActuel = new Date(dateActuelle);
  lundiActuel.setDate(dateActuelle.getDate() - joursEcoules);
  lundiActuel.setHours(0, 0, 0, 0);
  const dimancheActuel = new Date(lundiActuel);
  dimancheActuel.setDate(lundiActuel.getDate() + 6);
  dimancheActuel.setHours(23, 59, 59, 999);
  const lundiPrecedent = new Date(lundiActuel);
  lundiPrecedent.setDate(lundiActuel.getDate() - 7);
  const dimanchePrecedent = new Date(dimancheActuel);
  dimanchePrecedent.setDate(dimancheActuel.getDate() - 7);

  const ticketsSemaine = tickets.filter((t) => t.dateCreation && new Date(t.dateCreation) >= lundiActuel && new Date(t.dateCreation) <= dimancheActuel);
  const ticketsSemainePrec = tickets.filter((t) => t.dateCreation && new Date(t.dateCreation) >= lundiPrecedent && new Date(t.dateCreation) <= dimanchePrecedent);

  function tendance(valActuelle: number, valPrec: number) {
    if (valPrec === 0 && valActuelle === 0) return 'Stable';
    if (valPrec === 0) return '+100%';
    const diff = valActuelle - valPrec;
    const pourcent = Math.round((diff / Math.max(valPrec, 1)) * 100);
    if (diff === 0) return 'Stable';
    return diff > 0 ? `+${pourcent}%` : `${pourcent}%`;
  }
  const tendances = {
    total: tendance(ticketsSemaine.length, ticketsSemainePrec.length),
    resolu: tendance(ticketsSemaine.filter((t) => t.statut === 'resolu').length, ticketsSemainePrec.filter((t) => t.statut === 'resolu').length),
    enCours: tendance(ticketsSemaine.filter((t) => t.statut === 'en_cours').length, ticketsSemainePrec.filter((t) => t.statut === 'en_cours').length),
    nonAssigne: tendance(ticketsSemaine.filter((t) => !t.idTechnicien).length, ticketsSemainePrec.filter((t) => !t.idTechnicien).length),
  };

  const statCards = [
    { label: 'Total tickets', value: statistiques.total, sub: `${tendances.total} cette semaine`, icon: <BarChart3 size={18} /> },
    { label: 'Tickets résolus', value: statistiques.resolu, sub: `${tendances.resolu} vs semaine précédente`, icon: <Check size={18} /> },
    { label: 'Tickets en cours', value: statistiques.enCours, sub: tendances.enCours, icon: <Clock size={18} /> },
    { label: 'Non assignés', value: statistiques.nonAssigne, sub: tendances.nonAssigne, icon: <AlertTriangle size={18} /> },
  ];

  const actions = [
    { label: 'Tickets à traiter', description: 'Voir tous les tickets en attente', href: '/technicien/tickets', icon: <ClipboardList size={18} /> },
    { label: 'Tickets urgents', description: 'Accès direct aux urgences', href: '/technicien/tickets?urgent=1', icon: <AlertTriangle size={18} /> },
    { label: 'Rapport & stats', description: 'Statistiques de résolution', href: '/technicien/rapport', icon: <FileText size={18} /> },
  ];

  return (
    <DashboardLayout role="technicien">
      <PageHeader
        title={`Bonjour, ${utilisateur?.prenom || ''}`}
        description="Vue d'ensemble de votre activité et de vos tickets."
        actions={
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              connexionWebSocket === 'connecte'
                ? 'bg-emerald-50 text-emerald-700'
                : connexionWebSocket === 'deconnecte'
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connexionWebSocket === 'connecte' ? 'bg-emerald-500' : connexionWebSocket === 'deconnecte' ? 'bg-red-500' : 'bg-amber-500'
              }`}
            />
            {connexionWebSocket === 'connecte' ? 'Temps réel actif' : connexionWebSocket === 'deconnecte' ? 'Hors ligne' : 'Connexion...'}
          </span>
        }
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
              <div className="text-xs text-slate-500 mt-1">{s.sub}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Répartition des tickets</h3>
            <Select
              value={modeCamembert}
              onChange={(e) => setModeCamembert(e.target.value as 'statut' | 'technicien')}
              className="w-auto h-8 text-xs"
            >
              <option value="statut">Par statut</option>
              <option value="technicien">Par technicien</option>
            </Select>
          </CardHeader>
          <CardBody>
            {(modeCamembert === 'statut' ? totalCamembertStatut : totalCamembertTechnicien) > 0 ? (
              <div className="flex items-center gap-6 flex-wrap">
                <svg width="192" height="192" viewBox="0 0 192 192" className="shrink-0">
                  {modeCamembert === 'statut' && renderCamembert(camembertStatut)}
                  {modeCamembert === 'technicien' && renderCamembert(camembertTechnicien)}
                </svg>
                <div className="flex flex-col gap-2">
                  {(modeCamembert === 'statut' ? camembertStatut : camembertTechnicien).map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm cursor-pointer rounded px-1.5 py-0.5"
                      onMouseEnter={() => setPartSurvolee(i)}
                      onMouseLeave={() => setPartSurvolee(null)}
                    >
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.couleur }} />
                      <span className="text-slate-600">{item.libelle}</span>
                      <span className="font-semibold text-slate-900">{item.valeur}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-10">Aucune donnée disponible</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Tickets créés cette semaine</h3>
          </CardHeader>
          <CardBody>
            <div className="h-40 flex items-end justify-between gap-3">
              {valeursBarres.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500">{val}</span>
                  <div
                    className="w-full rounded-t bg-brand-500"
                    style={{ height: `${Math.max((val / maxBarre) * 100, 3)}%` }}
                  />
                  <span className="text-xs text-slate-400">{jours[i]}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900">Actions rapides</h3>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          {actions.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="flex items-center justify-between p-4 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">{a.icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.description}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-brand-600">Accéder →</span>
            </a>
          ))}
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}
