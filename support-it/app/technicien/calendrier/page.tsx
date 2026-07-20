'use client';

import React from 'react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import TechnicianCalendar from '../../../components/TechnicianCalendar';
import useAuthRedirect from '../../../hooks/useAuthRedirect';

// Page purement client (localStorage, sockets, données chargées au runtime) :
// pas de contenu statique à pré-générer, et le pré-rendu échouait pour cette
// page précise (composant calendrier) — on la rend à la demande comme le
// reste de l'app protégée par authentification.
export const dynamic = 'force-dynamic';

export default function CalendrierTechnicien() {
  const authChecked = useAuthRedirect();
  if (!authChecked) return null; // Bloque le rendu tant que l'auth n'est pas validée
  return (
    <DashboardLayout role="technicien">
      <PageHeader title="Calendrier" description="Planification et rendez-vous de vos interventions." />
      <TechnicianCalendar />
    </DashboardLayout>
  );
}
