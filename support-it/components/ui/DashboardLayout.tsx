'use client';

import React, { useEffect, useState } from 'react';
import SidebarTechnicien from './SidebarTechnicien';
import SidebarDirecteur from './SidebarDirecteur';
import SidebarAdmin from './SidebarAdmin';
import SidebarEmploye from './SidebarEmploye';

type Role = 'technicien' | 'directeur' | 'admin' | 'employe';

interface StoredUser {
  nom?: string;
  prenom?: string;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  nomTechnicien?: string;
  prenomTechnicien?: string;
  role?: string;
}

export default function DashboardLayout({ role, children }: { role: Role; children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const normalized = user
    ? {
        nom: user.nom || user.nomTechnicien || user.nomUtilisateur || '',
        prenom: user.prenom || user.prenomTechnicien || user.prenomUtilisateur || '',
        role: user.role || '',
      }
    : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {role === 'technicien' && <SidebarTechnicien user={normalized} />}
      {role === 'directeur' && <SidebarDirecteur user={normalized} />}
      {role === 'admin' && <SidebarAdmin user={normalized} />}
      {role === 'employe' && <SidebarEmploye user={normalized} />}
      <main className="flex-1 min-w-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
