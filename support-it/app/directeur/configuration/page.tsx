'use client';

import React from 'react';
import { Building2, Users, Settings, ClipboardList } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';

export default function ConfigurationPage() {
  // Navigation widgets
  const goTo = (url: string) => window.location.href = url;

  const actions = [
    { label: 'Ajouter entreprise', desc: 'Nouvelle entreprise cliente', icon: <Building2 size={24} />, onClick: () => goTo('/directeur/administration') },
    { label: 'Gestion utilisateurs', desc: 'Gérer les comptes utilisateurs', icon: <Users size={24} />, onClick: () => goTo('/directeur/utilisateur') },
    { label: 'Paramètres', desc: 'Réglages de la plateforme', icon: <Settings size={24} />, onClick: () => goTo('/directeur/parametre') },
    { label: 'Centre rapports', desc: 'Rapports et exports', icon: <ClipboardList size={24} />, onClick: () => goTo('/directeur/statistiques') },
  ];

  return (
    <DashboardLayout role="directeur">
      <PageHeader title="Configuration" description="Accès rapide aux outils d'administration et réglages système." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {actions.map((a) => (
          <Card
            key={a.label}
            className="h-full cursor-pointer hover:border-brand-300"
            onClick={a.onClick}
          >
            <CardBody className="flex flex-col items-center text-center gap-2">
              <span className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">{a.icon}</span>
              <p className="text-sm font-semibold text-slate-900">{a.label}</p>
              <p className="text-xs text-slate-500">{a.desc}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
