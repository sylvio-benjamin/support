'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Star, Wrench, Settings, User, Mail, Phone, Building2, Users, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Field, Input, Select } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';

interface Technicien {
  idTechnicien: number;
  loginTechnicien: string;
  nomTechnicien: string;
  prenomTechnicien: string;
  emailTechnicien: string;
  role: string;
  telephone?: string;
  dateCreation?: string;
  roleService?: string; // Service du technicien
}

const ROLE_TONE: Record<string, 'danger' | 'warning' | 'info' | 'brand' | 'neutral'> = {
  directeur: 'danger',
  referent: 'warning',
  technicien: 'info',
  admin: 'brand',
};

export default function AdminTechniciens() {
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const [techniciens, setTechniciens] = useState<Technicien[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState<'tous' | 'technicien' | 'referent' | 'directeur'>('tous');


  useEffect(() => {
    const donneesUtilisateur = localStorage.getItem('user');
    if (donneesUtilisateur) setUtilisateur(JSON.parse(donneesUtilisateur));
  }, []);

  useEffect(() => {
    if (!utilisateur) return;
    chargerTechniciens();
  }, [utilisateur]);

  const chargerTechniciens = async () => {
    setChargement(true);
    try {
      console.log('Chargement des techniciens depuis la BDD...');
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTechnicien.php`, { credentials: 'include' });
      const data = await reponse.json();
      console.log('Réponse de l\'API techniciens:', data);
      if (data.success) {
        console.log('Techniciens récupérés:', data.techniciens);
        setTechniciens(data.techniciens || []);
      } else {
        console.error('Erreur API:', data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des techniciens:', error);
    } finally {
      setChargement(false);
    }
  };



  const techniciensFiltres = techniciens.filter(technicien => {
    // Exclure le compte affichageLog
    if (technicien.loginTechnicien === 'affichageLog') {
      return false;
    }

    const rechercheNormalisee = recherche.toLowerCase();
    const matchRecherche =
      (technicien.nomTechnicien || '').toLowerCase().includes(rechercheNormalisee) ||
      (technicien.prenomTechnicien || '').toLowerCase().includes(rechercheNormalisee) ||
      (technicien.emailTechnicien || '').toLowerCase().includes(rechercheNormalisee) ||
      (technicien.loginTechnicien || '').toLowerCase().includes(rechercheNormalisee);

    // Inclure tous les rôles quand "tous" est sélectionné, sinon filtrer par le rôle sélectionné
    const matchRole = filtreRole === 'tous' || technicien.role === filtreRole;
    // Tous les techniciens sont maintenant considérés comme actifs - pas besoin de filtrer par statut

    return matchRecherche && matchRole;
  });

  const obtenirInitiales = (nom: string, prenom: string) => {
    return ((prenom ? prenom[0] : '') + (nom ? nom[0] : '')).toUpperCase();
  };

  const getIconeRole = (role: string): React.ComponentType<{ size?: number | string }> => {
    switch (role) {
      case 'directeur': return Crown;
      case 'referent': return Star;
      case 'technicien': return Wrench;
      case 'admin': return Settings;
      default: return User;
    }
  };

  if (!utilisateur) {
    return (
      <DashboardLayout role="admin">
        <div className="text-center text-slate-500 py-16">Chargement utilisateur...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Équipe technique"
        description="Consultez les techniciens et directeurs de votre équipe de support."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={chargerTechniciens}>
            Actualiser
          </Button>
        }
      />

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Field label="Rechercher" htmlFor="recherche">
              <Input
                id="recherche"
                type="text"
                placeholder="Nom, prénom, email ou login..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </Field>

            <Field label="Rôle" htmlFor="filtreRole">
              <Select
                id="filtreRole"
                value={filtreRole}
                onChange={(e) => setFiltreRole(e.target.value as any)}
              >
                <option value="tous">Tous les rôles</option>
                <option value="technicien">Technicien</option>
                <option value="referent">Référent</option>
                <option value="directeur">Directeur</option>
              </Select>
            </Field>

            <div className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{techniciensFiltres.length}</span> technicien(s) affiché(s)
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        {chargement ? (
          <div className="text-center text-slate-500 py-16">Chargement des techniciens...</div>
        ) : techniciensFiltres.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="Aucun technicien trouvé"
            description="Aucun technicien ne correspond à vos critères de recherche."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium px-5 py-3">Nom</th>
                  <th className="text-left font-medium px-5 py-3">Rôle</th>
                  <th className="text-left font-medium px-5 py-3">Contact</th>
                  <th className="text-left font-medium px-5 py-3">Service</th>
                  <th className="text-left font-medium px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {techniciensFiltres.map((technicien) => {
                  const IconeRole = getIconeRole(technicien.role);
                  return (
                    <tr key={technicien.idTechnicien} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                            {obtenirInitiales(technicien.nomTechnicien, technicien.prenomTechnicien)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{technicien.prenomTechnicien} {technicien.nomTechnicien}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1"><User size={12} /> {technicien.loginTechnicien}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={ROLE_TONE[technicien.role] || 'neutral'}>
                          <IconeRole size={12} /> <span className="ml-1">{technicien.role.charAt(0).toUpperCase() + technicien.role.slice(1)}</span>
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1 text-slate-600">
                          <span className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {technicien.emailTechnicien}</span>
                          {technicien.telephone && (
                            <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {technicien.telephone}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {technicien.roleService ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md text-xs font-medium">
                            <Building2 size={12} /> Service {technicien.roleService}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone="success">Actif</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
