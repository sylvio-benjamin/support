'use client';

import React, { useEffect, useState } from 'react';
import SidebarTechnicien from './SidebarTechnicien';
import SidebarDirecteur from './SidebarDirecteur';
import SidebarAdmin from './SidebarAdmin';
import SidebarEmploye from './SidebarEmploye';
import ChangerMotDePasseModal from '../ChangerMotDePasseModal';

type Role = 'technicien' | 'directeur' | 'admin' | 'employe';

interface StoredUser {
  nom?: string;
  prenom?: string;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  nomTechnicien?: string;
  prenomTechnicien?: string;
  role?: string;
  photoprofil?: string;
  photoProfil?: string;
  doitChangerMotDePasse?: boolean;
}

export default function DashboardLayout({ role, children }: { role: Role; children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mdpObligatoireOuvert, setMdpObligatoireOuvert] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        if (parsed?.doitChangerMotDePasse) setMdpObligatoireOuvert(true);
      } catch {
        setUser(null);
      }
    }
  }, []);

  const fermerMdpObligatoire = () => {
    setMdpObligatoireOuvert(false);
    // Le compte en local ne doit plus déclencher la modale aux prochains rendus.
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.doitChangerMotDePasse = false;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    } catch {
      // silencieux
    }
  };

  const normalized = user
    ? {
        nom: user.nom || user.nomTechnicien || user.nomUtilisateur || '',
        prenom: user.prenom || user.prenomTechnicien || user.prenomUtilisateur || '',
        role: user.role || '',
        photoprofil: user.photoprofil || user.photoProfil,
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
      {mdpObligatoireOuvert && <ChangerMotDePasseModal onClose={fermerMdpObligatoire} obligatoire />}
    </div>
  );
}
