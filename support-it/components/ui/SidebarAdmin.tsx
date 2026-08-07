'use client';

import React from 'react';
import { Home, ClipboardList, Wrench, Users, Calendar, Bell, User } from 'lucide-react';
import SidebarShell, { NavSection } from './SidebarShell';
import useAdminNotifications from '../hooks/useAdminNotifications';

export default function SidebarAdmin({ user }: { user: { nom: string; prenom: string; role: string; photoprofil?: string } | null }) {
  const { unreadTicketCount, unreadMessageCount } = useAdminNotifications();

  const sections: NavSection[] = [
    {
      title: 'Navigation',
      items: [
        { label: 'Tableau de bord', href: '/admin', icon: <Home size={16} />, exact: true },
        { label: 'Mes tickets', href: '/admin/mes-tickets', icon: <ClipboardList size={16} />, badge: unreadTicketCount },
        { label: 'Techniciens', href: '/admin/techniciens', icon: <Wrench size={16} /> },
        { label: 'Employés', href: '/admin/liste-employes', icon: <Users size={16} /> },
      ],
    },
    {
      title: 'Outils',
      items: [
        { label: 'Calendrier', href: '/admin/calendrier', icon: <Calendar size={16} /> },
        { label: 'Notifications', href: '/admin/notifications', icon: <Bell size={16} />, badge: unreadMessageCount },
        { label: 'Profil', href: '/admin/profil', icon: <User size={16} /> },
      ],
    },
  ];

  return (
    <SidebarShell
      brand="LyovaTech Support"
      sections={sections}
      user={user ? { nom: user.nom, prenom: user.prenom, roleLabel: user.role || 'Admin', photoprofil: user.photoprofil } : null}
    />
  );
}
