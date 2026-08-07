'use client';

import React from 'react';
import { Home, Ticket, ClipboardList, PlusCircle, Archive, Calendar, FileText, Bell, User } from 'lucide-react';
import SidebarShell, { NavSection } from './SidebarShell';
import useTechnicienNotifications from '../hooks/useTechnicienNotifications';

export default function SidebarTechnicien({ user }: { user: { nom: string; prenom: string; role: string; photoprofil?: string } | null }) {
  const { unreadTicketCount, unreadMessageCount } = useTechnicienNotifications();

  const sections: NavSection[] = [
    {
      title: 'Navigation',
      items: [
        { label: 'Tableau de bord', href: '/technicien', icon: <Home size={16} />, exact: true },
        { label: 'Tickets', href: '/technicien/tickets', icon: <Ticket size={16} />, badge: unreadTicketCount },
        { label: 'Mes tickets', href: '/technicien/mes-tickets', icon: <ClipboardList size={16} /> },
        { label: 'Nouveau ticket', href: '/technicien/nouveau-ticket', icon: <PlusCircle size={16} /> },
        { label: 'Archives', href: '/technicien/archives', icon: <Archive size={16} /> },
      ],
    },
    {
      title: 'Outils',
      items: [
        { label: 'Calendrier', href: '/technicien/calendrier', icon: <Calendar size={16} /> },
        { label: 'Rapport', href: '/technicien/rapport', icon: <FileText size={16} /> },
        { label: 'Notifications', href: '/technicien/notifications', icon: <Bell size={16} />, badge: unreadMessageCount },
        { label: 'Profil', href: '/technicien/profil', icon: <User size={16} /> },
      ],
    },
  ];

  return (
    <SidebarShell
      brand="LyovaTech Support"
      sections={sections}
      user={user ? { nom: user.nom, prenom: user.prenom, roleLabel: user.role || 'Technicien', photoprofil: user.photoprofil } : null}
    />
  );
}
