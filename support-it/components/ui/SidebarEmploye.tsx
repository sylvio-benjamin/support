'use client';

import React from 'react';
import { Home, Ticket, Archive, Calendar, Bell, User } from 'lucide-react';
import SidebarShell, { NavSection } from './SidebarShell';
import useEmployeNotifications from '../hooks/useEmployeNotifications';

export default function SidebarEmploye({ user }: { user: { nom: string; prenom: string; photoprofil?: string } | null }) {
  const { unreadTicketCount, unreadMessageCount } = useEmployeNotifications();

  const sections: NavSection[] = [
    {
      title: 'Navigation',
      items: [
        { label: 'Tableau de bord', href: '/employe', icon: <Home size={16} />, exact: true },
        { label: 'Mes tickets', href: '/employe/ticket', icon: <Ticket size={16} />, badge: unreadTicketCount },
        { label: 'Archives', href: '/employe/archives', icon: <Archive size={16} /> },
      ],
    },
    {
      title: 'Outils',
      items: [
        { label: 'Calendrier', href: '/employe/calendrier', icon: <Calendar size={16} /> },
        { label: 'Notifications', href: '/employe/notifications', icon: <Bell size={16} />, badge: unreadMessageCount },
        { label: 'Profil', href: '/employe/profil', icon: <User size={16} /> },
      ],
    },
  ];

  return (
    <SidebarShell
      brand="LyovaTech Support"
      sections={sections}
      user={user ? { nom: user.nom, prenom: user.prenom, roleLabel: 'Employé', photoprofil: user.photoprofil } : null}
    />
  );
}
