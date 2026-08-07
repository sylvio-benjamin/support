'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { BarChart3, Check, Clock, AlertTriangle, ListChecks, ShieldAlert, LineChart, Eye } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { PrioriteBadge, StatutBadge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';

export default function MesTicketsDirecteur() {
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [statistiques, setStatistiques] = useState({ total: 0, enCours: 0, resolu: 0, nonAssigne: 0 });
  const [connexionWebSocket, setConnexionWebSocket] = useState<'connecte' | 'deconnecte' | 'connexion'>('connexion');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUser(user);

      // « Mes tickets » = tickets qui me sont assignés (ou partagés avec moi)
      // en tant que technicien, pas l'ensemble des tickets de la plateforme
      // (ça, c'est /directeur/tickets).
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/mesTickets.php`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.tickets) {
            setTickets(data.tickets);
            setStatistiques({
              total: data.tickets.length,
              enCours: data.tickets.filter((t: any) => t.statut === 'en_cours').length,
              resolu: data.tickets.filter((t: any) => t.statut === 'resolu').length,
              nonAssigne: data.tickets.filter((t: any) => !t.idTechnicien).length
            });
          }
          setChargement(false);
        })
        .catch(() => setChargement(false));
    }
    const socketInstance = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}`, {
      transports: ['websocket', 'polling'],
      timeout: 5000
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
        nonAssigne: nouveauxTickets.filter((t: any) => !t.idTechnicien).length
      });
    });
    socketInstance.on('nouveau_ticket', (nouveauTicket) => {
      setTickets(prev => [...prev, nouveauTicket]);
    });
    socketRef.current = socketInstance;
    return () => { socketInstance.disconnect(); };
  }, []);

  // Statistiques et graphiques (exemple simplifié)
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
  let valeursBarres: number[] = Array(7).fill(0);
  tickets.forEach(ticket => {
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

  const statCards = [
    { label: 'Total tickets', value: statistiques.total, sub: 'Tous statuts confondus', icon: <BarChart3 size={18} /> },
    { label: 'Tickets résolus', value: statistiques.resolu, sub: 'Depuis 1 semaine', icon: <Check size={18} /> },
    { label: 'Tickets en cours', value: statistiques.enCours, sub: 'En attente de traitement', icon: <Clock size={18} /> },
    { label: 'Non assignés', value: statistiques.nonAssigne, sub: 'À assigner aujourd\'hui', icon: <AlertTriangle size={18} /> },
  ];

  const actions = [
    { label: 'Voir tous les tickets', description: 'Liste complète des tickets', href: '/directeur/tickets', icon: <ListChecks size={18} /> },
    { label: 'Tickets urgents', description: 'Accès direct aux urgences', href: '/directeur/tickets?urgent=1', icon: <ShieldAlert size={18} /> },
    { label: 'Rapports & stats', description: 'Statistiques et performances', href: '/directeur/statistiques', icon: <LineChart size={18} /> },
  ];

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title="Mes tickets"
        description={`Bonjour, ${user?.prenom || ''} ${user?.nom || ''} — vue d'ensemble de l'activité et des tickets.`}
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
            {connexionWebSocket === 'connecte' ? 'Temps réel actif' : connexionWebSocket === 'deconnecte' ? 'Mise à jour toutes les 10s' : 'Connexion en cours...'}
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

      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900">Mes tickets assignés</h3>
        </CardHeader>
        {chargement ? (
          <p className="text-sm text-slate-500 text-center py-16">Chargement des tickets...</p>
        ) : tickets.length === 0 ? (
          <EmptyState
            title="Aucun ticket assigné"
            description="Les tickets dont vous êtes responsable, ou qui vous sont partagés, apparaîtront ici."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Priorité</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Créé</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.idTicket} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold text-brand-600">#{ticket.idTicket}</span>
                      <div className="font-medium text-slate-900">{ticket.titre}</div>
                      <div className="text-xs text-slate-500">
                        {ticket.prenomUtilisateur} {ticket.nomUtilisateur}
                        {ticket.nomEntreprise && <> · {ticket.nomEntreprise}</>}
                      </div>
                    </td>
                    <td className="py-3 px-4"><PrioriteBadge priorite={ticket.priorite} /></td>
                    <td className="py-3 px-4"><StatutBadge statut={ticket.statut} /></td>
                    <td className="py-3 px-4 text-slate-500">
                      {ticket.dateCreation ? new Date(ticket.dateCreation).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`/directeur/ticket/${ticket.idTicket}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        <Eye size={14} /> Voir
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
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

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Vue d&apos;ensemble</h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-500">Des graphiques avancés et des indicateurs de performance seront bientôt disponibles ici.</p>
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
