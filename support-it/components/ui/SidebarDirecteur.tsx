'use client';

import React from 'react';
import { Home, Ticket, ClipboardList, PlusCircle, Wrench, Users, Building2, BarChart3, Archive, Calendar, SlidersHorizontal, Settings, Bell, User, MonitorPlay } from 'lucide-react';
import SidebarShell, { NavSection } from './SidebarShell';
import useDirecteurNotifications from '../hooks/useDirecteurNotifications';

export default function SidebarDirecteur({ user }: { user: { nom: string; prenom: string; role: string; photoprofil?: string } | null }) {
  const { unreadTicketCount, unreadMessageCount } = useDirecteurNotifications();

  const sections: NavSection[] = [
    {
      title: 'Navigation',
      items: [
        { label: 'Tableau de bord', href: '/directeur', icon: <Home size={16} />, exact: true },
        { label: 'Tickets', href: '/directeur/tickets', icon: <Ticket size={16} />, badge: unreadTicketCount },
        { label: 'Mes tickets', href: '/directeur/mes-tickets', icon: <ClipboardList size={16} /> },
        { label: 'Nouveau ticket', href: '/directeur/nouveau-ticket', icon: <PlusCircle size={16} /> },
        { label: 'Administration', href: '/directeur/administration', icon: <Wrench size={16} /> },
        { label: 'Utilisateurs', href: '/directeur/utilisateur', icon: <Users size={16} /> },
        { label: 'Entreprises', href: '/directeur/entreprises', icon: <Building2 size={16} /> },
        { label: 'Statistiques', href: '/directeur/statistiques', icon: <BarChart3 size={16} /> },
        { label: 'Archives', href: '/directeur/archives', icon: <Archive size={16} /> },
      ],
    },
    {
      title: 'Outils',
      items: [
        { label: 'Calendrier', href: '/directeur/calendrier', icon: <Calendar size={16} /> },
        { label: 'Affichage', href: '/affichage', icon: <MonitorPlay size={16} /> },
        { label: 'Paramètres', href: '/directeur/parametre', icon: <Settings size={16} /> },
        { label: 'Notifications', href: '/directeur/notifications', icon: <Bell size={16} />, badge: unreadMessageCount },
        { label: 'Profil', href: '/directeur/profil', icon: <User size={16} /> },
      ],
    },
  ];

  return (
    <SidebarShell
      brand="LyovaTech Support"
      sections={sections}
      user={user ? { nom: user.nom, prenom: user.prenom, roleLabel: 'Directeur', photoprofil: user.photoprofil } : null}
    />
  );
}
