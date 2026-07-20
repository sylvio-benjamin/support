'use client';

import React from 'react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import TechnicianCalendar from '../../../components/TechnicianCalendar';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';

export default function CalendrierDirecteur() {
  useAuthRedirect();

  return (
    <DashboardLayout role="directeur">
      <PageHeader title="Calendrier" description="Planification et rendez-vous techniciens." />
      <TechnicianCalendar />
    </DashboardLayout>
  );
}
