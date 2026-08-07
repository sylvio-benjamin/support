'use client';

import React from 'react';
import {
  Clock, Calendar, Users, Ticket as TicketIconLucide,
  Timer, TrendingUp, Hourglass, Zap, CheckCircle2, Sparkles, ClipboardList,
  User, Building2, Wrench, Tag,
} from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import Badge, { PrioriteBadge, StatutBadge, ServiceBadge } from './ui/Badge';
import { colorForService } from '../styles/tokens';

export interface AffichageTicket {
  idTicket: number;
  titre: string;
  description: string;
  priorite: string;
  statut: string;
  dateCreation: string;
  categorie: string;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  nomTechnicien?: string;
  prenomTechnicien?: string;
  nombreMessages?: number;
  nomEntreprise?: string;
}

interface AffichageMuralViewProps {
  tickets: AffichageTicket[];
  ticketsArchives: any[];
  technicienCount: number;
  currentTime: Date | null;
  lastUpdate: string;
  headerActions?: React.ReactNode;
}

// Vue partagée par l'écran mural authentifié (/affichage, réservé au
// directeur) et l'écran mural public à token (/ecran-affichage/[token]) :
// seule la façon dont les données arrivent (session vs token) diffère entre
// les deux pages, l'affichage lui-même est identique.
export default function AffichageMuralView({
  tickets, ticketsArchives, technicienCount, currentTime, lastUpdate, headerActions,
}: AffichageMuralViewProps) {
  const getTimeAgo = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);

      if (minutes < 60) {
        return `il y a ${minutes} min`;
      } else {
        return `il y a ${hours}h${minutes % 60 > 0 ? String(minutes % 60).padStart(2, '0') : ''}`;
      }
    } catch (error) {
      console.error('Erreur getTimeAgo:', error);
      return 'il y a quelques instants';
    }
  };

  const getTechnicienInitiales = (ticket: AffichageTicket) => {
    if (ticket.nomTechnicien && ticket.prenomTechnicien) {
      return ticket.prenomTechnicien.charAt(0) + ticket.nomTechnicien.charAt(0);
    }
    return '?';
  };

  const getTechnicienNom = (ticket: AffichageTicket) => {
    if (ticket.nomTechnicien && ticket.prenomTechnicien) {
      return `${ticket.prenomTechnicien} ${ticket.nomTechnicien.charAt(0)}.`;
    }
    return 'Non assigné';
  };

  const maintenant = new Date();
  const aujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const demain = new Date(aujourdhui.getTime() + 24 * 60 * 60 * 1000);

  const ticketsAujourdhui = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.dateCreation);
    return ticketDate >= aujourdhui && ticketDate < demain;
  });

  const archivesAujourdhui = ticketsArchives.filter(archive => {
    const archiveDate = new Date(archive.dateCreation);
    return archiveDate >= aujourdhui && archiveDate < demain;
  });

  const tousTicketsAujourdhui = [...ticketsAujourdhui, ...archivesAujourdhui];

  const ticketsResolusAvecTemps = [...ticketsArchives].filter(t =>
    (t.statut === 'resolu' || t.statut === 'ferme') && t.dateTicketCloture
  );

  const tempsMoyenResolution = ticketsResolusAvecTemps.length > 0 ?
    ticketsResolusAvecTemps.reduce((total, ticket) => {
      const dateCreation = new Date(ticket.dateCreation);
      const dateCloture = new Date(ticket.dateTicketCloture);
      const diffTime = Math.abs(dateCloture.getTime() - dateCreation.getTime());
      const diffMinutes = Math.ceil(diffTime / (1000 * 60));
      return total + diffMinutes;
    }, 0) / ticketsResolusAvecTemps.length : 0;

  const ticketsResolusAujourdhui = [...ticketsAujourdhui, ...archivesAujourdhui].filter(t =>
    (t.statut === 'resolu' || t.statut === 'ferme') && t.dateTicketCloture
  );

  const tempsMoyenResolutionAujourdhui = ticketsResolusAujourdhui.length > 0 ?
    ticketsResolusAujourdhui.reduce((total, ticket) => {
      const dateCreation = new Date(ticket.dateCreation);
      const dateCloture = new Date(ticket.dateTicketCloture);
      const diffTime = Math.abs(dateCloture.getTime() - dateCreation.getTime());
      const diffMinutes = Math.ceil(diffTime / (1000 * 60));
      return total + diffMinutes;
    }, 0) / ticketsResolusAujourdhui.length : 0;

  const totalGlobal = tickets.length + ticketsArchives.length;

  const stats = {
    total: tousTicketsAujourdhui.length,
    enAttente: ticketsAujourdhui.filter(t => t.statut === 'en_attente' || t.statut === 'nouveau').length,
    enCours: ticketsAujourdhui.filter(t => t.statut === 'en_cours').length,
    resolus: ticketsAujourdhui.filter(t => t.statut === 'resolu' || t.statut === 'ferme').length +
             archivesAujourdhui.filter(a => a.statut === 'resolu' || a.statut === 'ferme').length,
    totalGlobal,
    tempsMoyenResolution: Math.round(tempsMoyenResolution),
  };

  const arrondirCentieme = (n: number) => Math.round(n * 100) / 100;

  const formatDureeMinutes = (minutes: number) => {
    if (minutes <= 0) return 'N/A';
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = arrondirCentieme(minutes % 60);
      return `${h}h${m > 0 ? m : ''}`;
    }
    return `${arrondirCentieme(minutes)}min`;
  };

  const maintenant30 = new Date();
  const trenteMinutesAgo = new Date(maintenant30.getTime() - 30 * 60 * 1000);

  const nouveauxTickets = tickets.filter((ticket) => {
    const ticketDate = new Date(ticket.dateCreation);
    const isRecent = ticketDate > trenteMinutesAgo;
    const isNewStatus = !ticket.statut || ticket.statut === 'en_attente' || ticket.statut === 'nouveau' || ticket.statut === 'ouvert';
    return isRecent && isNewStatus;
  });

  const autresTickets = tickets.filter((ticket) => {
    const ticketDate = new Date(ticket.dateCreation);
    const isRecent = ticketDate > trenteMinutesAgo;
    const isNewStatus = !ticket.statut || ticket.statut === 'en_attente' || ticket.statut === 'nouveau' || ticket.statut === 'ouvert';
    return !(isRecent && isNewStatus);
  });

  const NouveauTicketCard = ({ ticket }: { ticket: AffichageTicket }) => {
    const userName = `${ticket.prenomUtilisateur || ''} ${ticket.nomUtilisateur || ''}`.trim() || 'Utilisateur inconnu';
    const serviceName = ticket.categorie || 'Service non défini';
    const messageCount = ticket.nombreMessages ?? 0;

    return (
      <Card className="flex flex-col ring-2 ring-emerald-400">
        <CardBody className="flex flex-col flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded">#{ticket.idTicket}</span>
              {messageCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                  {messageCount}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">{getTimeAgo(ticket.dateCreation)}</span>
          </div>

          <h3 className="text-sm font-semibold text-slate-900 mb-2 leading-snug">{ticket.titre || 'Titre non défini'}</h3>

          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge tone="brand">
              <User size={12} className="mr-1" /> {userName}
            </Badge>
            <Badge tone="neutral">
              <Building2 size={12} className="mr-1" /> {ticket.nomEntreprise || 'Entreprise inconnue'}
            </Badge>
            <ServiceBadge color={colorForService(serviceName)}>
              <Tag size={12} className="mr-1" /> {serviceName}
            </ServiceBadge>
            <StatutBadge statut={ticket.statut} />
          </div>

          <p className="text-sm text-slate-600 line-clamp-3 flex-1">{ticket.description || 'Description non disponible'}</p>

          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
            <PrioriteBadge priorite={ticket.priorite} />
            {ticket.nomTechnicien ? (
              <Badge tone="info">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] font-semibold mr-1">
                  {getTechnicienInitiales(ticket)}
                </span>
                {getTechnicienNom(ticket)}
              </Badge>
            ) : (
              <Badge tone="warning">
                <Wrench size={12} className="mr-1" /> Non assigné
              </Badge>
            )}
          </div>
        </CardBody>
      </Card>
    );
  };

  const TicketCard = ({ ticket }: { ticket: AffichageTicket }) => {
    const userName = `${ticket.prenomUtilisateur || ''} ${ticket.nomUtilisateur || ''}`.trim() || 'Utilisateur inconnu';
    const serviceName = ticket.categorie || 'Service non défini';
    const messageCount = ticket.nombreMessages ?? 0;

    return (
      <Card className="flex flex-col">
        <CardBody className="flex flex-col flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded">#{ticket.idTicket}</span>
              {messageCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                  {messageCount}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">{getTimeAgo(ticket.dateCreation)}</span>
          </div>

          <h3 className="text-sm font-semibold text-slate-900 mb-2 leading-snug">{ticket.titre || 'Titre non défini'}</h3>

          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge tone="brand">
              <User size={12} className="mr-1" /> {userName}
            </Badge>
            <Badge tone="neutral">
              <Building2 size={12} className="mr-1" /> {ticket.nomEntreprise || 'Entreprise inconnue'}
            </Badge>
            <ServiceBadge color={colorForService(serviceName)}>
              <Tag size={12} className="mr-1" /> {serviceName}
            </ServiceBadge>
            <StatutBadge statut={ticket.statut} />
          </div>

          <p className="text-sm text-slate-600 line-clamp-3 flex-1">{ticket.description || 'Description non disponible'}</p>

          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
            <PrioriteBadge priorite={ticket.priorite} />
            {ticket.nomTechnicien ? (
              <Badge tone="info">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] font-semibold mr-1">
                  {getTechnicienInitiales(ticket)}
                </span>
                {getTechnicienNom(ticket)}
              </Badge>
            ) : (
              <Badge tone="warning">
                <Wrench size={12} className="mr-1" /> Non assigné
              </Badge>
            )}
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <img src="/images/logo_lyo-removebg-preview.png" alt="LyovaTech" className="w-11 h-11 object-contain" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Centre de Support</h1>
            <p className="text-sm text-slate-500 mt-1">État des tickets en temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
        </div>
      </div>

      {/* Barre de statut */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge tone="success">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          En direct
        </Badge>
        <Badge tone="neutral"><Clock size={12} className="mr-1" /> {currentTime ? currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Badge>
        <Badge tone="neutral"><Calendar size={12} className="mr-1" /> {currentTime ? currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</Badge>
        <Badge tone="neutral"><Users size={12} className="mr-1" /> {technicienCount} techniciens disponibles</Badge>
        <Badge tone="neutral"><TicketIconLucide size={12} className="mr-1" /> {stats.totalGlobal} tickets</Badge>
        {tempsMoyenResolutionAujourdhui > 0 && (
          <Badge tone="neutral"><Timer size={12} className="mr-1" /> {formatDureeMinutes(tempsMoyenResolutionAujourdhui)} aujourd'hui</Badge>
        )}
        {tempsMoyenResolution > 0 && (
          <Badge tone="neutral"><TrendingUp size={12} className="mr-1" /> {formatDureeMinutes(tempsMoyenResolution)} global</Badge>
        )}
      </div>

      {/* Stats compactes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Total aujourd'hui</span>
              <span className="w-8 h-8 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center"><TicketIconLucide size={16} /></span>
            </div>
            <div className="text-3xl font-semibold text-slate-900">{stats.total}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">En attente</span>
              <span className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center"><Hourglass size={16} /></span>
            </div>
            <div className="text-3xl font-semibold text-slate-900">{stats.enAttente}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">En cours</span>
              <span className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center"><Zap size={16} /></span>
            </div>
            <div className="text-3xl font-semibold text-slate-900">{stats.enCours}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Résolus</span>
              <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={16} /></span>
            </div>
            <div className="text-3xl font-semibold text-slate-900">{stats.resolus}</div>
          </CardBody>
        </Card>
      </div>

      {/* Section nouveaux tickets */}
      {nouveauxTickets.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-500" />
              Nouvelles demandes
              <Badge tone="success">{nouveauxTickets.length}</Badge>
            </h2>
            <span className="text-xs text-slate-400">Dernière mise à jour : {lastUpdate}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {nouveauxTickets.map((ticket, index) => (
              <NouveauTicketCard key={`nouveau-${ticket.idTicket}-${index}`} ticket={ticket} />
            ))}
          </div>
        </div>
      )}

      {/* Section tous les tickets */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <ClipboardList size={16} />
          Toutes les demandes
        </h2>

        {autresTickets.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500 py-10">
              Aucune demande à afficher pour le moment.
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {autresTickets.map((ticket, index) => (
              <TicketCard key={`autre-${ticket.idTicket}-${index}`} ticket={ticket} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
        Pour toute urgence, contactez le support au <strong className="font-medium text-slate-500">03 10 45 44 65</strong> — Système de ticketing LyovaTech
      </div>
    </div>
  );
}
