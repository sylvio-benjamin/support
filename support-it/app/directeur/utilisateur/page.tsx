'use client';

import React, { useRef, useState, useEffect } from 'react';
import { User, Wrench, Building2, Users, Settings, ClipboardList, X } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Field, Input, Select } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';

export default function Page() {
  return <GestionUtilisateursPage />;
}

function roleTone(roleClass: string): 'danger' | 'success' | 'info' {
  if (roleClass === 'role-admin') return 'danger';
  if (roleClass === 'role-tech') return 'success';
  return 'info';
}

function statutTone(statutClass: string): 'success' | 'info' {
  return statutClass === 'role-tech' ? 'success' : 'info';
}

function GestionUtilisateursPage() {
  // États pour les données réelles
  const [stats, setStats] = useState([
    { value: '0', label: 'Utilisateurs totaux' },
    { value: '0', label: 'Nouveaux ce mois' },
    { value: '0%', label: 'Actifs' },
    { value: '0', label: 'Note moyenne' },
  ]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entreprises, setEntreprises] = useState<{ idEntreprise: string | number; nomEntreprise: string }[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'techniciens', 'employes', 'entreprises'
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [selectedTechnicien, setSelectedTechnicien] = useState<any | null>(null);
  const [servicesActuels, setServicesActuels] = useState<{ idService: number | string; nomService: string }[]>([]);
  const [servicesDisponibles, setServicesDisponibles] = useState<{ idService: number | string; nomService: string }[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [entreprisesCompletes, setEntreprisesCompletes] = useState<any[]>([]);
  const [loadingEntreprises, setLoadingEntreprises] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    login: '', prenom: '', nom: '', email: '', telephone: '', idEntreprise: '', roleEntreprise: 'employe', desactiver: false, password: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Charger les utilisateurs et entreprises depuis les APIs
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Récupérer les informations de l'utilisateur connecté
        const userData = localStorage.getItem('user');
        let user: any = null;
        if (userData) {
          user = JSON.parse(userData);
          // Le rôle n'est pas stocké dans l'objet "user" lui-même (voir
          // FormulaireConnexion.tsx : réponse.user et réponse.role sont deux
          // champs distincts, seul "user" est mis dans localStorage sous
          // cette clé) — il vit dans la clé localStorage séparée "userRole".
          // Sans ce repli, user.role est TOUJOURS undefined, et les branches
          // ci-dessous (directeur/referent/admin) ne se déclenchent jamais.
          user.role = user.role || localStorage.getItem('userRole') || '';
        }

        // Charger les entreprises (toutes pour le directeur, seulement celle de l'admin ref)
        let entreprisesEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeEntreprise.php`;
        if (user && (user.role === 'referent' || user.role === 'admin')) {
          // Pour l'admin ref, on ne charge que sa propre entreprise
          setEntreprises([{
            idEntreprise: user.idEntreprise,
            nomEntreprise: user.nomEntreprise || 'Mon entreprise'
          }]);
        } else {
          const entreprisesResponse = await fetch(entreprisesEndpoint, {
            credentials: 'include'
          });
          const entreprisesData = await entreprisesResponse.json();

          if (entreprisesData.success && entreprisesData.entreprises) {
            setEntreprises(entreprisesData.entreprises);
          }
        }

        // Charger les utilisateurs (employés)
        let usersEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateur.php`;
        if (user && (user.role === 'referent' || user.role === 'admin')) {
          usersEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateurParEntreprise.php`;
        }

        const usersResponse = await fetch(usersEndpoint, {
          credentials: 'include'
        });
        const usersData = await usersResponse.json();

        // Charger les techniciens/directeurs
        const techResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTechnicien.php`, {
          credentials: 'include'
        });
        const techData = await techResponse.json();

        // Charger les services (pour la création de techniciens)
        const servicesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeServices.php`, {
          credentials: 'include'
        });
        const servicesData = await servicesResponse.json();

        if (servicesData.success && servicesData.services) {
          setServices(servicesData.services);
        }

        // Charger les entreprises complètes (pour le directeur uniquement)
        if (user && user.role === 'directeur') {
          try {
            const entreprisesCompletesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeEntreprisesCompletes.php`, {
              credentials: 'include'
            });
            const entreprisesCompletesData = await entreprisesCompletesResponse.json();

            if (entreprisesCompletesData.success && entreprisesCompletesData.entreprises) {
              setEntreprisesCompletes(entreprisesCompletesData.entreprises);
            }
          } catch (error) {
            console.error('Erreur lors du chargement des entreprises complètes:', error);
          }
        }

        // Combiner et formater les données
        const allUsers: any[] = [];

        // Ajouter les utilisateurs (employés)
        if (usersData.success && usersData.utilisateurs) {
          usersData.utilisateurs.forEach((user: { loginUtilisateur: any; prenomUtilisateur: any[]; nomUtilisateur: any[]; emailUtilisateur: any; telephone: any; nomEntreprise: any; idEntreprise: any; roleEntreprise: any; desactiver: any; idUtilisateur: any; }) => {
            return allUsers.push({
              avatar: (user.prenomUtilisateur?.[0] || '') + (user.nomUtilisateur?.[0] || ''),
              nom: `${user.prenomUtilisateur || ''} ${user.nomUtilisateur || ''}`.trim(),
              login: user.loginUtilisateur,
              prenom: user.prenomUtilisateur,
              nomSeul: user.nomUtilisateur,
              email: user.emailUtilisateur,
              telephone: user.telephone,
              entreprise: user.nomEntreprise || 'Entreprise non définie',
              idEntreprise: user.idEntreprise,
              roleEntreprise: user.roleEntreprise,
              role: 'Utilisateur',
              statut: user.desactiver ? 'Inactif' : 'Actif',
              desactiver: !!user.desactiver,
              roleClass: 'role-user',
              statutClass: user.desactiver ? 'role-user' : 'role-tech',
              id: user.idUtilisateur,
              type: 'utilisateur'
            });
          });
        }

        // Ajouter les techniciens/directeurs
        if (techData.success && techData.techniciens) {
          techData.techniciens.forEach((tech: { prenomTechnicien: any[]; nomTechnicien: any[]; emailTechnicien: any; role: string; services: any; idTechnicien: any; }) => {
            allUsers.push({
              avatar: (tech.prenomTechnicien?.[0] || '') + (tech.nomTechnicien?.[0] || ''),
              nom: `${tech.prenomTechnicien || ''} ${tech.nomTechnicien || ''}`.trim(),
              email: tech.emailTechnicien,
              entreprise: 'Support Lyovatech',
              role: tech.role === 'directeur' ? 'Directeur' : 'Technicien',
              services: tech.services || 'Aucun service',
              statut: 'Actif',
              roleClass: tech.role === 'directeur' ? 'role-admin' : 'role-tech',
              statutClass: 'role-tech',
              id: tech.idTechnicien,
              type: 'technicien'
            });
          });
        }

        setUsers(allUsers);

        // Mettre à jour les statistiques
        const totalUsers = allUsers.length;
        const activeUsers = allUsers.filter(u => u.statut === 'Actif').length;
        const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

        // Si c'est un admin ref, charger les statistiques spécifiques à son entreprise
        if (user && (user.role === 'referent' || user.role === 'admin')) {
          try {
            const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/statistiquesDashboardParEntreprise.php`, {
              credentials: 'include'
            });
            const statsData = await statsResponse.json();

            if (statsData.success && statsData.statistiques) {
              const stats = statsData.statistiques;
              setStats([
                { value: totalUsers.toString(), label: 'Utilisateurs totaux' },
                { value: stats.tickets?.tickets_semaine?.toString() || '0', label: 'Nouveaux ce mois' },
                { value: `${activePercentage}%`, label: 'Actifs' },
                { value: stats.tickets?.total_tickets?.toString() || '0', label: 'Tickets totaux' },
              ]);
            } else {
              setStats([
                { value: totalUsers.toString(), label: 'Utilisateurs totaux' },
                { value: '0', label: 'Nouveaux ce mois' },
                { value: `${activePercentage}%`, label: 'Actifs' },
                { value: '0', label: 'Tickets totaux' },
              ]);
            }
          } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            setStats([
              { value: totalUsers.toString(), label: 'Utilisateurs totaux' },
              { value: '0', label: 'Nouveaux ce mois' },
              { value: `${activePercentage}%`, label: 'Actifs' },
              { value: '0', label: 'Tickets totaux' },
            ]);
          }
        } else {
          setStats([
            { value: totalUsers.toString(), label: 'Utilisateurs totaux' },
            { value: '0', label: 'Nouveaux ce mois' }, // À calculer si nécessaire
            { value: `${activePercentage}%`, label: 'Actifs' },
            { value: '4.7', label: 'Note moyenne' }, // À calculer si nécessaire
          ]);
        }

      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);
  type FormState = {
    login: string;
    prenom: string;
    nom: string;
    email: string;
    tel: string;
    entreprise: string;
    role: string;
    password: string;
    services: string[]; // Changé en tableau pour sélection multiple
  };

  const [form, setForm] = useState<FormState>({
    login: '',
    prenom: '',
    nom: '',
    email: '',
    tel: '',
    entreprise: '',
    role: '',
    password: '',
    services: [],
  });
  const [submitText, setSubmitText] = useState("Créer l'utilisateur");
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const userFormRef = useRef<HTMLFormElement>(null);

  // Scroll vers le formulaire
  const showAddUserForm = () => {
    userFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  // Réinitialiser le formulaire
  const resetForm = () => {
    setForm({ login: '', prenom: '', nom: '', email: '', tel: '', entreprise: '', role: '', password: '', services: [] });
    userFormRef.current?.reset();
  };

  // Gérer le changement de rôle
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setForm({ ...form, role: newRole, entreprise: '', services: [] }); // Réinitialiser l'entreprise et les services quand on change de rôle
  };

  // Gérer la sélection multiple de services
  const handleServiceToggle = (serviceId: string) => {
    const services = form.services || [];
    if (services.includes(serviceId)) {
      setForm({ ...form, services: services.filter(id => id !== serviceId) });
    } else {
      setForm({ ...form, services: [...services, serviceId] });
    }
  };
  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitText('Création en cours...');
    setSubmitDisabled(true);

    try {
      let apiUrl = '';
      let requestData: any = {};

      if (form.role === 'utilisateur' || form.role === 'admin') {
        // Vérifier qu'une entreprise est sélectionnée
        if (!form.entreprise) {
          alert('Une entreprise est requise pour créer un utilisateur ou admin référent');
          setSubmitText("Créer l'utilisateur");
          setSubmitDisabled(false);
          return;
        }

        // Créer un utilisateur ou admin référent
        apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/inscriptionUtilisateur.php`;
        requestData = {
          loginUtilisateur: form.login,
          nomUtilisateur: form.nom,
          prenomUtilisateur: form.prenom,
          emailUtilisateur: form.email,
          motDePasseUtilisateur: form.password,
          telephone: form.tel || null,
          naissance: null,
          photoprofil: null,
          desactiver: 0,
          idEntreprise: parseInt(form.entreprise),
          roleEntreprise: form.role === 'admin' ? 'admin' : 'employe'
        };
      } else {
        // Créer un technicien ou directeur (pas d'entreprise)
        apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/inscriptionTechniciens.php`;
        requestData = {
          login: form.login,
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          password: form.password,
          role: form.role === 'directeur' ? 'directeur' : 'technicien'
        };

        // Ajouter les services si c'est un technicien et que des services sont sélectionnés
        if (form.role === 'technicien' && form.services && form.services.length > 0) {
          requestData.services = form.services.map(id => parseInt(id));
        }
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Utilisateur créé avec succès !');
        resetForm();
        // Recharger la page pour afficher le nouvel utilisateur
        window.location.reload();
      } else {
        alert('Erreur lors de la création : ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert('Erreur lors de la création de l\'utilisateur');
    } finally {
      setSubmitText("Créer l'utilisateur");
      setSubmitDisabled(false);
    }
  };

  const ajouterUtilisateur = handleSubmit;

  // Fonction pour filtrer les utilisateurs
  const getFilteredUsers = () => {
    if (activeFilter === 'all') {
      return users;
    } else if (activeFilter === 'techniciens') {
      return users.filter(user => user.type === 'technicien');
    } else if (activeFilter === 'employes') {
      return users.filter(user => user.type === 'utilisateur');
    }
    return users;
  };

  // Fonction pour ouvrir le modal de modification des services
  const ouvrirModalServices = async (technicien: any | null) => {
    if (!technicien || technicien.type !== 'technicien') {
      alert('Seuls les techniciens peuvent avoir des services assignés');
      return;
    }

    setSelectedTechnicien(technicien);
    setLoadingServices(true);
    setShowServicesModal(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getServicesTechnicien.php?idTechnicien=${technicien.id}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setServicesActuels(data.servicesActuels);
        setServicesDisponibles(data.servicesDisponibles);
      } else {
        alert('Erreur lors du chargement des services: ' + data.error);
        setShowServicesModal(false);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion lors du chargement des services');
      setShowServicesModal(false);
    } finally {
      setLoadingServices(false);
    }
  };

  // Fonction pour ajouter un service
  const ajouterService = async (idService: any) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/modifierServicesTechnicien.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ajouter',
          idTechnicien: selectedTechnicien.id,
          idService: idService
        }),
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        // Recharger les services
        const servicesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getServicesTechnicien.php?idTechnicien=${selectedTechnicien.id}`, {
          credentials: 'include'
        });
        const servicesData = await servicesResponse.json();

        if (servicesData.success) {
          setServicesActuels(servicesData.servicesActuels);
          setServicesDisponibles(servicesData.servicesDisponibles);
        }

        // Mettre à jour la liste des utilisateurs sans recharger la page
        const loadData = async () => {
          try {
            // Récupérer les informations de l'utilisateur connecté
            const userData = localStorage.getItem('user');
            let user: any = null;
            if (userData) {
              user = JSON.parse(userData);
              // Le rôle n'est pas stocké dans l'objet "user" lui-même (voir
              // FormulaireConnexion.tsx : réponse.user et réponse.role sont
              // deux champs distincts, seul "user" est mis dans localStorage
              // sous cette clé) — il vit dans la clé localStorage séparée
              // "userRole". Sans ce repli, user.role est TOUJOURS undefined,
              // et les branches ci-dessous (directeur/referent/admin) ne se
              // déclenchent jamais.
              user.role = user.role || localStorage.getItem('userRole') || '';
            }

            // Charger les entreprises (toutes pour le directeur, seulement celle de l'admin ref)
            let entreprisesEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeEntreprise.php`;
            if (user && (user.role === 'referent' || user.role === 'admin')) {
              // Pour l'admin ref, on ne charge que sa propre entreprise
              setEntreprises([{
                idEntreprise: user.idEntreprise,
                nomEntreprise: user.nomEntreprise || 'Mon entreprise'
              }]);
            } else {
              const entreprisesResponse = await fetch(entreprisesEndpoint, {
                credentials: 'include'
              });
              const entreprisesData = await entreprisesResponse.json();

              if (entreprisesData.success && entreprisesData.entreprises) {
                setEntreprises(entreprisesData.entreprises);
              }
            }

            // Charger les utilisateurs (employés)
            let usersEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateur.php`;
            if (user && (user.role === 'referent' || user.role === 'admin')) {
              usersEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateurParEntreprise.php`;
            }

            const usersResponse = await fetch(usersEndpoint, {
              credentials: 'include'
            });
            const usersData = await usersResponse.json();

            // Charger les techniciens/directeurs
            const techResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTechnicien.php`, {
              credentials: 'include'
            });
            const techData = await techResponse.json();

            // Charger les services (pour la création de techniciens)
            const servicesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeServices.php`, {
              credentials: 'include'
            });
            const servicesData = await servicesResponse.json();

            if (servicesData.success && servicesData.services) {
              setServices(servicesData.services);
            }

            // Combiner et formater les données
            const allUsers: any[] = [];

            // Ajouter les utilisateurs (employés)
            if (usersData.success && usersData.utilisateurs) {
              usersData.utilisateurs.forEach((user: { loginUtilisateur: any; prenomUtilisateur: any[]; nomUtilisateur: any[]; emailUtilisateur: any; telephone: any; nomEntreprise: any; idEntreprise: any; roleEntreprise: any; desactiver: any; idUtilisateur: any; }) => {
                allUsers.push({
                  avatar: (user.prenomUtilisateur?.[0] || '') + (user.nomUtilisateur?.[0] || ''),
                  nom: `${user.prenomUtilisateur || ''} ${user.nomUtilisateur || ''}`.trim(),
                  login: user.loginUtilisateur,
                  prenom: user.prenomUtilisateur,
                  nomSeul: user.nomUtilisateur,
                  email: user.emailUtilisateur,
                  telephone: user.telephone,
                  entreprise: user.nomEntreprise || 'Entreprise non définie',
                  idEntreprise: user.idEntreprise,
                  roleEntreprise: user.roleEntreprise,
                  role: 'Utilisateur',
                  statut: user.desactiver ? 'Inactif' : 'Actif',
                  desactiver: !!user.desactiver,
                  roleClass: 'role-user',
                  statutClass: user.desactiver ? 'role-user' : 'role-tech',
                  id: user.idUtilisateur,
                  type: 'utilisateur'
                });
              });
            }

            // Ajouter les techniciens/directeurs
            if (techData.success && techData.techniciens) {
              techData.techniciens.forEach((tech: { prenomTechnicien: any[]; nomTechnicien: any[]; emailTechnicien: any; role: string; services: any; idTechnicien: any; }) => {
                allUsers.push({
                  avatar: (tech.prenomTechnicien?.[0] || '') + (tech.nomTechnicien?.[0] || ''),
                  nom: `${tech.prenomTechnicien || ''} ${tech.nomTechnicien || ''}`.trim(),
                  email: tech.emailTechnicien,
                  entreprise: 'Support Lyovatech',
                  role: tech.role === 'directeur' ? 'Directeur' : 'Technicien',
                  services: tech.services || 'Aucun service',
                  statut: 'Actif',
                  roleClass: tech.role === 'directeur' ? 'role-admin' : 'role-tech',
                  statutClass: 'role-tech',
                  id: tech.idTechnicien,
                  type: 'technicien'
                });
              });
            }

            setUsers(allUsers);
          } catch (error) {
            console.error('Erreur lors du rechargement des données:', error);
          }
        };

        loadData();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion lors de l\'ajout du service');
    }
  };

  // Fonction pour supprimer un service
  const supprimerService = async (idService: any) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/modifierServicesTechnicien.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'supprimer',
          idTechnicien: selectedTechnicien.id,
          idService: idService
        }),
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        // Recharger les services
        const servicesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getServicesTechnicien.php?idTechnicien=${selectedTechnicien.id}`, {
          credentials: 'include'
        });
        const servicesData = await servicesResponse.json();

        if (servicesData.success) {
          setServicesActuels(servicesData.servicesActuels);
          setServicesDisponibles(servicesData.servicesDisponibles);
        }

        // Mettre à jour la liste des utilisateurs sans recharger la page
        const loadData = async () => {
          try {
            // Récupérer les informations de l'utilisateur connecté
            const userData = localStorage.getItem('user');
            let user: any = null;
            if (userData) {
              user = JSON.parse(userData);
              // Le rôle n'est pas stocké dans l'objet "user" lui-même (voir
              // FormulaireConnexion.tsx : réponse.user et réponse.role sont
              // deux champs distincts, seul "user" est mis dans localStorage
              // sous cette clé) — il vit dans la clé localStorage séparée
              // "userRole". Sans ce repli, user.role est TOUJOURS undefined,
              // et les branches ci-dessous (directeur/referent/admin) ne se
              // déclenchent jamais.
              user.role = user.role || localStorage.getItem('userRole') || '';
            }

            // Charger les entreprises (toutes pour le directeur, seulement celle de l'admin ref)
            let entreprisesEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeEntreprise.php`;
            if (user && (user.role === 'referent' || user.role === 'admin')) {
              // Pour l'admin ref, on ne charge que sa propre entreprise
              setEntreprises([{
                idEntreprise: user.idEntreprise,
                nomEntreprise: user.nomEntreprise || 'Mon entreprise'
              }]);
            } else {
              const entreprisesResponse = await fetch(entreprisesEndpoint, {
                credentials: 'include'
              });
              const entreprisesData = await entreprisesResponse.json();

              if (entreprisesData.success && entreprisesData.entreprises) {
                setEntreprises(entreprisesData.entreprises);
              }
            }

            // Charger les utilisateurs (employés)
            let usersEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateur.php`;
            if (user && (user.role === 'referent' || user.role === 'admin')) {
              usersEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateurParEntreprise.php`;
            }

            const usersResponse = await fetch(usersEndpoint, {
              credentials: 'include'
            });
            const usersData = await usersResponse.json();

            // Charger les techniciens/directeurs
            const techResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeTechnicien.php`, {
              credentials: 'include'
            });
            const techData = await techResponse.json();

            // Charger les services (pour la création de techniciens)
            const servicesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeServices.php`, {
              credentials: 'include'
            });
            const servicesData = await servicesResponse.json();

            if (servicesData.success && servicesData.services) {
              setServices(servicesData.services);
            }

            // Combiner et formater les données
            const allUsers: any[] = [];

            // Ajouter les utilisateurs (employés)
            if (usersData.success && usersData.utilisateurs) {
              usersData.utilisateurs.forEach((user: { loginUtilisateur: any; prenomUtilisateur: any[]; nomUtilisateur: any[]; emailUtilisateur: any; telephone: any; nomEntreprise: any; idEntreprise: any; roleEntreprise: any; desactiver: any; idUtilisateur: any; }) => {
                allUsers.push({
                  avatar: (user.prenomUtilisateur?.[0] || '') + (user.nomUtilisateur?.[0] || ''),
                  nom: `${user.prenomUtilisateur || ''} ${user.nomUtilisateur || ''}`.trim(),
                  login: user.loginUtilisateur,
                  prenom: user.prenomUtilisateur,
                  nomSeul: user.nomUtilisateur,
                  email: user.emailUtilisateur,
                  telephone: user.telephone,
                  entreprise: user.nomEntreprise || 'Entreprise non définie',
                  idEntreprise: user.idEntreprise,
                  roleEntreprise: user.roleEntreprise,
                  role: 'Utilisateur',
                  statut: user.desactiver ? 'Inactif' : 'Actif',
                  desactiver: !!user.desactiver,
                  roleClass: 'role-user',
                  statutClass: user.desactiver ? 'role-user' : 'role-tech',
                  id: user.idUtilisateur,
                  type: 'utilisateur'
                });
              });
            }

            // Ajouter les techniciens/directeurs
            if (techData.success && techData.techniciens) {
              techData.techniciens.forEach((tech: { prenomTechnicien: any[]; nomTechnicien: any[]; emailTechnicien: any; role: string; services: any; idTechnicien: any; }) => {
                allUsers.push({
                  avatar: (tech.prenomTechnicien?.[0] || '') + (tech.nomTechnicien?.[0] || ''),
                  nom: `${tech.prenomTechnicien || ''} ${tech.nomTechnicien || ''}`.trim(),
                  email: tech.emailTechnicien,
                  entreprise: 'Support Lyovatech',
                  role: tech.role === 'directeur' ? 'Directeur' : 'Technicien',
                  services: tech.services || 'Aucun service',
                  statut: 'Actif',
                  roleClass: tech.role === 'directeur' ? 'role-admin' : 'role-tech',
                  statutClass: 'role-tech',
                  id: tech.idTechnicien,
                  type: 'technicien'
                });
              });
            }

            setUsers(allUsers);
          } catch (error) {
            console.error('Erreur lors du rechargement des données:', error);
          }
        };

        loadData();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion lors de la suppression du service');
    }
  };

  // Fonction pour supprimer un technicien
  const supprimerTechnicien = async (idTechnicien: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce technicien ? Cette action est irréversible.')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/supprimerTechnicien.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idTechnicien }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        alert('Technicien supprimé avec succès.');
        // Recharger les données
        window.location.reload();
      } else {
        alert('Erreur: ' + (data.error || 'Erreur lors de la suppression'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion lors de la suppression');
    }
  };

  // Ouvre la modale d'édition d'un utilisateur (employé/admin référent)
  const ouvrirModalEdition = (u: any) => {
    setEditingUser(u);
    setEditForm({
      login: u.login || '',
      prenom: u.prenom || '',
      nom: u.nomSeul || '',
      email: u.email || '',
      telephone: u.telephone || '',
      idEntreprise: u.idEntreprise ? String(u.idEntreprise) : '',
      roleEntreprise: u.roleEntreprise || 'employe',
      desactiver: !!u.desactiver,
      password: '',
    });
    setShowEditModal(true);
  };

  // Soumission de la modification d'un utilisateur
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/modifierUtilisateur.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          idUtilisateur: editingUser.id,
          loginUtilisateur: editForm.login,
          nomUtilisateur: editForm.nom,
          prenomUtilisateur: editForm.prenom,
          emailUtilisateur: editForm.email,
          telephone: editForm.telephone || null,
          idEntreprise: editForm.idEntreprise ? parseInt(editForm.idEntreprise) : null,
          roleEntreprise: editForm.roleEntreprise,
          desactiver: editForm.desactiver ? 1 : 0,
          motDePasseUtilisateur: editForm.password || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        window.location.reload();
      } else {
        alert('Erreur lors de la modification : ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion lors de la modification');
    } finally {
      setSavingEdit(false);
    }
  };

  // Suppression d'un utilisateur (employé/admin référent)
  const supprimerUtilisateurAction = async (idUtilisateur: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/supprimerUtilisateur.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idUtilisateur }),
      });
      const data = await response.json();
      if (data.success) {
        alert('Utilisateur supprimé avec succès.');
        window.location.reload();
      } else {
        alert('Erreur : ' + (data.error || 'Erreur lors de la suppression'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion lors de la suppression');
    }
  };

  // Fonction pour désactiver/activer une entreprise
  const toggleEntreprise = async (idEntreprise: number, action: 'desactiver' | 'activer') => {
    const message = action === 'desactiver'
      ? 'Êtes-vous sûr de vouloir désactiver cette entreprise ? Tous ses utilisateurs (y compris les admins référents) ne pourront plus se connecter.'
      : 'Êtes-vous sûr de vouloir activer cette entreprise ? Tous ses utilisateurs pourront à nouveau se connecter.';

    if (!confirm(message)) {
      return;
    }

    setLoadingEntreprises(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/desactiverEntreprise.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idEntreprise, action }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        // Recharger les données
        window.location.reload();
      } else {
        alert('Erreur: ' + (data.error || 'Erreur lors de l\'opération'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion lors de l\'opération');
    } finally {
      setLoadingEntreprises(false);
    }
  };

  // Navigation widgets
  const goTo = (url: string) => window.location.href = url;

  const actions = [
    { label: 'Ajouter entreprise', desc: 'Nouvelle entreprise cliente', icon: <Building2 size={24} />, onClick: () => goTo('/directeur/administration') },
    { label: 'Gestion utilisateurs', desc: 'Gérer les comptes utilisateurs', icon: <Users size={24} />, onClick: undefined },
    { label: 'Configuration', desc: 'Paramètres système', icon: <Settings size={24} />, onClick: () => goTo('/directeur/configuration') },
    // Note: route corrigée — "/directeur/rapports" n'existe pas, la page réelle est "/directeur/statistiques".
    { label: 'Centre rapports', desc: 'Rapports et exports', icon: <ClipboardList size={24} />, onClick: () => goTo('/directeur/statistiques') },
  ];

  const filters = [
    { id: 'all', label: 'Tous les utilisateurs', icon: null },
    { id: 'techniciens', label: 'Techniciens', icon: <Wrench size={14} /> },
    { id: 'employes', label: 'Employés', icon: <Users size={14} /> },
    { id: 'entreprises', label: 'Entreprises', icon: <Building2 size={14} /> },
  ];

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title="Gestion des utilisateurs"
        description="Gérez les comptes utilisateurs, techniciens et entreprises."
        actions={<Button variant="primary" onClick={showAddUserForm}>+ Ajouter un utilisateur</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {actions.map((a) => (
          <Card key={a.label} className={a.onClick ? 'cursor-pointer hover:border-brand-300' : ''} onClick={a.onClick}>
            <CardBody className="flex flex-col items-center text-center gap-2">
              <span className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">{a.icon}</span>
              <p className="text-sm font-semibold text-slate-900">{a.label}</p>
              <p className="text-xs text-slate-500">{a.desc}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardBody>
              <div className="text-3xl font-semibold text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Liste</h3>
          <div className="flex gap-2 flex-wrap">
            {filters.map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={activeFilter === f.id ? 'primary' : 'secondary'}
                icon={f.icon || undefined}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        {loading ? (
          <p className="text-sm text-slate-500 text-center py-16">Chargement des utilisateurs...</p>
        ) : activeFilter === 'entreprises' ? (
          entreprisesCompletes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                    <th className="text-left font-medium py-3 px-4">Entreprise</th>
                    <th className="text-left font-medium py-3 px-4">Localisation</th>
                    <th className="text-left font-medium py-3 px-4">Utilisateurs</th>
                    <th className="text-left font-medium py-3 px-4">Admins</th>
                    <th className="text-left font-medium py-3 px-4">Statut</th>
                    <th className="text-right font-medium py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entreprisesCompletes.map((entreprise, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{entreprise.nomEntreprise}</p>
                            <p className="text-xs text-slate-500">{entreprise.acronymeEntreprise || 'Aucun acronyme'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium">{entreprise.ville}, {entreprise.pays}</div>
                        <div className="text-xs text-slate-400">{entreprise.categorie || 'Non définie'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium">{entreprise.utilisateursActifs || 0} actifs</div>
                        <div className="text-xs text-slate-400">sur {entreprise.nombreUtilisateurs || 0} total</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge tone="danger">{entreprise.nombreAdmins || 0} admin{entreprise.nombreAdmins > 1 ? 's' : ''}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge tone={entreprise.desactiver ? 'danger' : 'success'}>{entreprise.desactiver ? 'Désactivée' : 'Active'}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant={entreprise.desactiver ? 'success' : 'danger'}
                          onClick={() => toggleEntreprise(entreprise.idEntreprise, entreprise.desactiver ? 'activer' : 'desactiver')}
                          disabled={loadingEntreprises}
                        >
                          {loadingEntreprises ? '...' : (entreprise.desactiver ? 'Activer' : 'Désactiver')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Aucune entreprise trouvée" icon={<Building2 size={22} />} />
          )
        ) : getFilteredUsers().length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium py-3 px-4">Utilisateur</th>
                  <th className="text-left font-medium py-3 px-4">Entreprise</th>
                  <th className="text-left font-medium py-3 px-4">Rôle</th>
                  <th className="text-left font-medium py-3 px-4">Services</th>
                  <th className="text-left font-medium py-3 px-4">Statut</th>
                  <th className="text-right font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredUsers().map((u, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0">{u.avatar}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{u.nom}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.entreprise}</td>
                    <td className="py-3 px-4"><Badge tone={roleTone(u.roleClass)}>{u.role}</Badge></td>
                    <td className="py-3 px-4">
                      {u.type === 'technicien' ? (
                        <span className="inline-block max-w-[200px] truncate text-xs font-medium bg-brand-50 text-brand-700 rounded-full px-2.5 py-1" title={u.services}>
                          {u.services}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4"><Badge tone={statutTone(u.statutClass)}>{u.statut}</Badge></td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => u.type === 'technicien' ? ouvrirModalServices(u) : ouvrirModalEdition(u)}
                        >
                          {u.type === 'technicien' ? 'Services' : 'Modifier'}
                        </Button>
                        {u.type === 'technicien' && u.role !== 'Directeur' && (
                          <Button size="sm" variant="danger" onClick={() => supprimerTechnicien(u.id)}>
                            Supprimer
                          </Button>
                        )}
                        {u.type === 'utilisateur' && (
                          <Button size="sm" variant="danger" onClick={() => supprimerUtilisateurAction(u.id)}>
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              activeFilter === 'techniciens' ? 'Aucun technicien trouvé' :
              activeFilter === 'employes' ? 'Aucun employé trouvé' :
              'Aucun utilisateur trouvé'
            }
            icon={<Users size={22} />}
          />
        )}
      </Card>

      {/* Formulaire + Activités récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Formulaire */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Ajouter un utilisateur</h3>
            <Button size="sm" variant="secondary" type="button" onClick={resetForm}>Réinitialiser</Button>
          </CardHeader>
          <CardBody>
            <form ref={userFormRef} onSubmit={ajouterUtilisateur} className="flex flex-col gap-4">
              <Field label="Login" htmlFor="login" required>
                <Input id="login" type="text" placeholder="Ex: jean.dupont" required value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} />
              </Field>
              <Field label="Prénom" htmlFor="prenom" required>
                <Input id="prenom" type="text" placeholder="Ex: Jean" required value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
              </Field>
              <Field label="Nom" htmlFor="nom" required>
                <Input id="nom" type="text" placeholder="Ex: Dupont" required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
              </Field>
              <Field label="Email" htmlFor="email" required>
                <Input id="email" type="email" placeholder="Ex: jean.dupont@exemple.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Téléphone" htmlFor="tel">
                <Input id="tel" type="tel" placeholder="Ex: +33 1 23 45 67 89" value={form.tel} onChange={e => setForm({ ...form, tel: e.target.value })} />
              </Field>
              <Field label="Rôle" htmlFor="role" required>
                <Select id="role" required value={form.role} onChange={handleRoleChange}>
                  <option value="">Sélectionner un rôle</option>
                  <option value="directeur">Directeur</option>
                  <option value="technicien">Technicien</option>
                  <option value="admin">Admin Référent</option>
                  <option value="utilisateur">Utilisateur</option>
                </Select>
                {form.role === 'utilisateur' && (
                  <p className="text-xs text-slate-500 mt-1">Les utilisateurs appartiennent à une entreprise spécifique</p>
                )}
                {form.role === 'admin' && (
                  <p className="text-xs text-slate-500 mt-1">L&apos;admin référent gère les utilisateurs de son entreprise</p>
                )}
                {(form.role === 'technicien' || form.role === 'directeur') && (
                  <p className="text-xs text-slate-500 mt-1">Les techniciens et directeurs font partie de la plateforme</p>
                )}
              </Field>
              {(form.role === 'utilisateur' || form.role === 'admin') && (
                <Field label="Entreprise" htmlFor="entreprise" required>
                  <Select id="entreprise" required={form.role === 'utilisateur' || form.role === 'admin'} value={form.entreprise} onChange={e => setForm({ ...form, entreprise: e.target.value })}>
                    <option value="">Sélectionner une entreprise</option>
                    {entreprises.map((entreprise) => (
                      <option key={entreprise.idEntreprise} value={entreprise.idEntreprise}>
                        {entreprise.nomEntreprise}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.role === 'admin'
                      ? "L'admin référent gère les utilisateurs de cette entreprise"
                      : "L'entreprise doit avoir au moins un admin référent"}
                  </p>
                </Field>
              )}
              {form.role === 'technicien' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Services assignés</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4 max-h-[200px] overflow-y-auto">
                    {services.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">Aucun service disponible</p>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 mb-3 cursor-pointer text-sm text-slate-800">
                          <input
                            type="checkbox"
                            checked={form.services.length === services.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({ ...form, services: services.map(s => s.idService.toString()) });
                              } else {
                                setForm({ ...form, services: [] });
                              }
                            }}
                          />
                          <strong>Tous les services</strong>
                        </label>
                        <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
                          {services.map((service) => (
                            <label key={service.idService} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={form.services.includes(service.idService.toString())}
                                onChange={() => handleServiceToggle(service.idService.toString())}
                              />
                              {service.nomService} ({service.heureDebut} - {service.heureFin})
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Sélectionnez un ou plusieurs services. Le technicien pourra voir les tickets de ces services.
                  </p>
                  {form.services.length > 0 && (
                    <div className="mt-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">
                      {form.services.length} service{form.services.length > 1 ? 's' : ''} sélectionné{form.services.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
              <Field label="Mot de passe temporaire" htmlFor="password" required>
                <Input id="password" type="password" placeholder="Générer automatiquement" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </Field>

              <Button type="submit" variant="primary" disabled={submitDisabled} className="w-full">
                {submitText}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Derniers comptes créés — dérivé des comptes déjà chargés (les
            tables utilisateur/techniciens n'ont pas de colonne de date de
            création ; l'ID auto-incrémenté sert d'indicateur d'ordre
            d'ajout, faute de mieux). Pas d'horodatage inventé. */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Derniers comptes créés</h3>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Aucun compte pour le moment.</p>
            ) : (
              [...users]
                .sort((a, b) => (b.id || 0) - (a.id || 0))
                .slice(0, 6)
                .map((u) => (
                  <div key={`${u.type}-${u.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="w-9 h-9 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                      {u.type === 'technicien' ? <Wrench size={16} /> : <User size={16} />}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{u.nom}</p>
                      <p className="text-xs text-slate-500">{u.role} · {u.entreprise}</p>
                    </div>
                  </div>
                ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modal de modification des services */}
      {showServicesModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Services de {selectedTechnicien?.nom}
              </h2>
              <button
                onClick={() => setShowServicesModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {loadingServices ? (
              <p className="text-sm text-slate-500 text-center py-10">Chargement des services...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Services actuels */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Services assignés ({servicesActuels.length})
                  </h3>
                  {servicesActuels.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-5 bg-slate-50 rounded-md">Aucun service assigné</p>
                  ) : (
                    <div className="bg-slate-50 rounded-md p-3 max-h-[300px] overflow-y-auto flex flex-col divide-y divide-slate-200">
                      {servicesActuels.map((service) => (
                        <div key={service.idService} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                          <span className="text-sm text-slate-800">{service.nomService}</span>
                          <Button size="sm" variant="danger" onClick={() => supprimerService(service.idService)}>
                            Retirer
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Services disponibles */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Services disponibles ({servicesDisponibles.length})
                  </h3>
                  {servicesDisponibles.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-5 bg-slate-50 rounded-md">Tous les services sont assignés</p>
                  ) : (
                    <div className="bg-slate-50 rounded-md p-3 max-h-[300px] overflow-y-auto flex flex-col divide-y divide-slate-200">
                      {servicesDisponibles.map((service) => (
                        <div key={service.idService} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                          <span className="text-sm text-slate-800">{service.nomService}</span>
                          <Button size="sm" variant="success" onClick={() => ajouterService(service.idService)}>
                            Ajouter
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal d'édition d'un utilisateur */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowEditModal(false)}>
          <div
            className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Modifier {editingUser.nom}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <Field label="Login" htmlFor="edit-login" required>
                <Input id="edit-login" type="text" required value={editForm.login} onChange={(e) => setEditForm({ ...editForm, login: e.target.value })} />
              </Field>
              <Field label="Prénom" htmlFor="edit-prenom" required>
                <Input id="edit-prenom" type="text" required value={editForm.prenom} onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })} />
              </Field>
              <Field label="Nom" htmlFor="edit-nom" required>
                <Input id="edit-nom" type="text" required value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} />
              </Field>
              <Field label="Email" htmlFor="edit-email" required>
                <Input id="edit-email" type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </Field>
              <Field label="Téléphone" htmlFor="edit-tel">
                <Input id="edit-tel" type="tel" value={editForm.telephone} onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })} />
              </Field>
              <Field label="Entreprise" htmlFor="edit-entreprise" required>
                <Select id="edit-entreprise" required value={editForm.idEntreprise} onChange={(e) => setEditForm({ ...editForm, idEntreprise: e.target.value })}>
                  <option value="">Sélectionner une entreprise</option>
                  {entreprises.map((entreprise) => (
                    <option key={entreprise.idEntreprise} value={entreprise.idEntreprise}>
                      {entreprise.nomEntreprise}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Rôle" htmlFor="edit-role" required>
                <Select id="edit-role" required value={editForm.roleEntreprise} onChange={(e) => setEditForm({ ...editForm, roleEntreprise: e.target.value })}>
                  <option value="employe">Employé</option>
                  <option value="admin">Admin référent</option>
                  <option value="directeur">Directeur (côté entreprise)</option>
                </Select>
              </Field>
              <Field label="Nouveau mot de passe" htmlFor="edit-password">
                <Input id="edit-password" type="password" placeholder="Laisser vide pour ne pas changer" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.desactiver}
                  onChange={(e) => setEditForm({ ...editForm, desactiver: e.target.checked })}
                />
                Compte désactivé
              </label>

              <div className="flex gap-3 mt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={savingEdit}>
                  {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
