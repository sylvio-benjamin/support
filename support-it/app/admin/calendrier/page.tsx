'use client';

import React from 'react';
import EmployeeCalendar from '../../../components/EmployeeCalendar';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';

export default function CalendrierAdmin() {
  useAuthRedirect();

  return (
    <DashboardLayout role="admin">
      <PageHeader title="Calendrier" description="Rendez-vous et événements planifiés." />
      <EmployeeCalendar />
    </DashboardLayout>
  );
}
