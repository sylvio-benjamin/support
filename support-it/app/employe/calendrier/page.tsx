'use client';

import React from 'react';
import EmployeeCalendar from '../../../components/EmployeeCalendar';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';

export default function CalendrierEmploye() {
  useAuthRedirect();

  return (
    <DashboardLayout role="employe">
      <PageHeader title="Calendrier" description="Vos rendez-vous et échéances liés à vos tickets." />
      <EmployeeCalendar />
    </DashboardLayout>
  );
}
