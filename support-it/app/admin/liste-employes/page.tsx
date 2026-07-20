'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Users, Building2, CheckCircle2, Ban, Plus, Mail, Smartphone, User, Pencil, Trash2, Clock, X } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Field, Input, Select } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';

// Fonction pour obtenir les initiales
const obtenirInitiales = (prenom: string, nom: string) => {
  return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrateur',
  technicien: 'Technicien',
  directeur: 'Directeur',
};

export default function AdminEmployes() {
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const [entreprise, setEntreprise] = useState<any>(null);
  const [employes, setEmployes] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modeEdition, setModeEdition] = useState(false);
  const [employeSelectionne, setEmployeSelectionne] = useState<any>(null);
  const [formData, setFormData] = useState({
    loginUtilisateur: '',
    nomUtilisateur: '',
    prenomUtilisateur: '',
    emailUtilisateur: '',
    motDePasseUtilisateur: '',
    roleEntreprise: 'employe', // Admin référent ne peut créer que des employés
    telephone: '',
    naissance: '',
    photoprofil: '',
    idEntreprise: 0, // Sera défini automatiquement selon l'admin connecté
    desactiver: 0 // 0 = actif, 1 = désactivé
  });

  useEffect(() => {
    const donneesUtilisateur = localStorage.getItem('user');
    if (donneesUtilisateur) {
      try {
        const userData = JSON.parse(donneesUtilisateur);
        setUtilisateur(userData);

        // Définir automatiquement l'entreprise de l'admin référent
        if (userData.idEntreprise) {
          setFormData(prev => ({ ...prev, idEntreprise: userData.idEntreprise }));
        }
      } catch (error) {
        console.error('Erreur parsing utilisateur:', error);
        setErreur('Erreur lors du chargement des données utilisateur');
      }
    } else {
      setErreur('Utilisateur non connecté');
    }
  }, []);

  useEffect(() => {
    if (!utilisateur) return;
    chargerEntreprise();
    chargerEmployes();
  }, [utilisateur]);

  const chargerEntreprise = async () => {
    try {
      console.log('Chargement des informations de l\'entreprise...');
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getEntrepriseInfo.php`, {
        credentials: 'include'
      });
      const data = await reponse.json();
      console.log('Réponse API entreprise:', data);
      if (data.success) {
        setEntreprise(data.entreprise);
        console.log('Entreprise chargée:', data.entreprise);
      } else {
        console.error('Erreur chargement entreprise:', data.error);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'entreprise:', error);
    }
  };

  const chargerEmployes = async () => {
    setChargement(true);
    setErreur('');

    try {
      // Debug de session pour diagnostiquer le problème
      console.log('Debug session admin...');
      const reponseDebug = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/debugSessionAdmin.php`, {
        credentials: 'include'
      });
      const debugData = await reponseDebug.json();
      console.log('Debug session admin:', debugData);

      // L'admin référent ne peut voir que les utilisateurs de son entreprise
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateurParEntreprise.php`, {
        credentials: 'include'
      });
      const data = await reponse.json();
      if (data.success) {
        setEmployes(data.utilisateurs || []);
      } else {
        console.error('Erreur employés:', data.error);
        setEmployes([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error);
      setErreur('Erreur de connexion au serveur');
      setEmployes([]);
    } finally {
      setChargement(false);
    }
  };



  // Calculer les statistiques
  const stats = {
    total: employes.length,
    actifs: employes.filter(e => e.desactiver === 0).length,
    enAttente: 0, // Pas de statut "en_attente" dans la BDD, on peut l'ajouter si nécessaire
    desactives: employes.filter(e => e.desactiver === 1).length
  };

  // Filtrer les employés selon la recherche
  const employesFiltres = employes.filter(employe =>
    employe.nomUtilisateur?.toLowerCase().includes(recherche.toLowerCase()) ||
    employe.prenomUtilisateur?.toLowerCase().includes(recherche.toLowerCase()) ||
    employe.emailUtilisateur?.toLowerCase().includes(recherche.toLowerCase()) ||
    employe.loginUtilisateur?.toLowerCase().includes(recherche.toLowerCase())
  );

  const ouvrirModal = (employe?: any) => {
    if (employe) {
      setModeEdition(true);
      setEmployeSelectionne(employe);
      setFormData({
        loginUtilisateur: employe.loginUtilisateur || '',
        nomUtilisateur: employe.nomUtilisateur || '',
        prenomUtilisateur: employe.prenomUtilisateur || '',
        emailUtilisateur: employe.emailUtilisateur || '',
        motDePasseUtilisateur: '',
        roleEntreprise: 'employe', // Admin référent ne peut modifier que vers employé
        telephone: employe.telephone || '',
        naissance: employe.naissance || '',
        photoprofil: employe.photoprofil || '',
        idEntreprise: employe.idEntreprise || utilisateur?.idEntreprise || 0,
        desactiver: employe.desactiver || 0
      });
    } else {
      setModeEdition(false);
      setEmployeSelectionne(null);
      setFormData({
        loginUtilisateur: '',
        nomUtilisateur: '',
        prenomUtilisateur: '',
        emailUtilisateur: '',
        motDePasseUtilisateur: '',
        roleEntreprise: 'employe', // Admin référent ne peut créer que des employés
        telephone: '',
        naissance: '',
        photoprofil: '',
        idEntreprise: utilisateur?.idEntreprise || 0,
        desactiver: 0
      });
    }
    setModalOuvert(true);
  };

  const fermerModal = () => {
    setModalOuvert(false);
    setEmployeSelectionne(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = modeEdition
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/modifierUtilisateur.php`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/inscriptionUtilisateur.php`;

      const reponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          idUtilisateur: modeEdition ? employeSelectionne.idUtilisateur : undefined
        }),
        credentials: 'include'
      });

      const data = await reponse.json();



      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/notificationCreationCompteUtilisateur.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );


      fermerModal();
      chargerEmployes();

    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion');
    }
  };

  const supprimerEmploye = async (idUtilisateur: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;

    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/supprimerUtilisateur.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idUtilisateur }),
        credentials: 'include'
      });

      const data = await reponse.json();
      if (data.success) {
        chargerEmployes();
      } else {
        alert('Erreur: ' + (data.error || 'Erreur lors de la suppression'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion');
    }
  };

  if (erreur) {
    return (
      <DashboardLayout role="admin">
        <div className="flex flex-col items-center justify-center text-center py-24">
          <AlertTriangle size={40} className="text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Erreur</h2>
          <p className="text-sm text-slate-500">{erreur}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!utilisateur) {
    return (
      <DashboardLayout role="admin">
        <div className="flex flex-col items-center justify-center text-center py-24">
          <Clock size={40} className="text-slate-400 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900">Chargement utilisateur...</h2>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { label: 'Employés total', value: stats.total, icon: <Users size={18} /> },
    { label: 'Comptes actifs', value: stats.actifs, icon: <CheckCircle2 size={18} /> },
    { label: 'En attente', value: stats.enAttente, icon: <Clock size={18} /> },
    { label: 'Désactivés', value: stats.desactives, icon: <Ban size={18} /> },
  ];

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Gestion des employés"
        description={
          entreprise
            ? `Administrez les comptes de vos collaborateurs — ${entreprise.nomEntreprise}`
            : 'Administrez les comptes de vos collaborateurs.'
        }
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => ouvrirModal()}>
            Ajouter un employé
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</span>
                <span className="w-8 h-8 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">{s.icon}</span>
              </div>
              <div className="text-3xl font-semibold text-slate-900">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardBody>
          <Field label="Rechercher" htmlFor="recherche">
            <Input
              id="recherche"
              type="text"
              placeholder="Rechercher un employé..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="max-w-md"
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        {chargement ? (
          <div className="text-center text-slate-500 py-16">Chargement des employés...</div>
        ) : employesFiltres.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="Aucun employé trouvé"
            description="Aucun employé ne correspond à votre recherche."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium px-5 py-3">Employé</th>
                  <th className="text-left font-medium px-5 py-3">Rôle</th>
                  <th className="text-left font-medium px-5 py-3">Contact</th>
                  <th className="text-left font-medium px-5 py-3">Statut</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employesFiltres.map((employe, index) => (
                  <tr key={employe.idUtilisateur || index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                          {obtenirInitiales(employe.prenomUtilisateur, employe.nomUtilisateur)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{employe.prenomUtilisateur || ''} {employe.nomUtilisateur || ''}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1"><User size={12} /> {employe.loginUtilisateur || 'Non renseigné'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {ROLE_LABEL[employe.roleEntreprise] || 'Employé'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1 text-slate-600">
                        <span className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {employe.emailUtilisateur || 'Non renseigné'}</span>
                        <span className="flex items-center gap-1.5"><Smartphone size={12} className="text-slate-400" /> {employe.telephone || 'Non renseigné'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={employe.desactiver === 0 ? 'success' : 'danger'}>
                        {employe.desactiver === 0 ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => ouvrirModal(employe)}>
                          Modifier
                        </Button>
                        <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => supprimerEmploye(employe.idUtilisateur)}>
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOuvert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 px-4">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {modeEdition ? 'Modifier un employé' : 'Ajouter un employé'}
              </h3>
              <button onClick={fermerModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Login utilisateur" htmlFor="loginUtilisateur" required>
                <Input
                  id="loginUtilisateur"
                  type="text"
                  required
                  value={formData.loginUtilisateur}
                  onChange={(e) => setFormData({ ...formData, loginUtilisateur: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Prénom" htmlFor="prenomUtilisateur" required>
                  <Input
                    id="prenomUtilisateur"
                    type="text"
                    required
                    value={formData.prenomUtilisateur}
                    onChange={(e) => setFormData({ ...formData, prenomUtilisateur: e.target.value })}
                  />
                </Field>
                <Field label="Nom" htmlFor="nomUtilisateur" required>
                  <Input
                    id="nomUtilisateur"
                    type="text"
                    required
                    value={formData.nomUtilisateur}
                    onChange={(e) => setFormData({ ...formData, nomUtilisateur: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Email" htmlFor="emailUtilisateur" required>
                <Input
                  id="emailUtilisateur"
                  type="email"
                  required
                  value={formData.emailUtilisateur}
                  onChange={(e) => setFormData({ ...formData, emailUtilisateur: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Téléphone" htmlFor="telephone">
                  <Input
                    id="telephone"
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                </Field>
                <Field label="Date de naissance" htmlFor="naissance">
                  <Input
                    id="naissance"
                    type="date"
                    value={formData.naissance}
                    onChange={(e) => setFormData({ ...formData, naissance: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Statut du compte" htmlFor="desactiver">
                <Select
                  id="desactiver"
                  value={formData.desactiver}
                  onChange={(e) => setFormData({ ...formData, desactiver: parseInt(e.target.value) })}
                >
                  <option value={0}>Actif</option>
                  <option value={1}>Désactivé</option>
                </Select>
              </Field>

              {!modeEdition && (
                <Field label="Mot de passe" htmlFor="motDePasseUtilisateur" required>
                  <Input
                    id="motDePasseUtilisateur"
                    type="password"
                    required={!modeEdition}
                    value={formData.motDePasseUtilisateur}
                    onChange={(e) => setFormData({ ...formData, motDePasseUtilisateur: e.target.value })}
                  />
                </Field>
              )}

              <div className="flex gap-3 justify-end mt-2">
                <Button type="button" variant="secondary" onClick={fermerModal}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary">
                  {modeEdition ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
