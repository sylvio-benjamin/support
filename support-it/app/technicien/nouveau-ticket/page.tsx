'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../../components/ui/Input';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import { Paperclip, ArrowLeft } from 'lucide-react';

export default function NouveauTicketTechnicien() {
  useAuthRedirect();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sousCategories, setSousCategories] = useState<string[]>([]);
  const [chargement, setChargement] = useState(false);
  const [chargementEmployes, setChargementEmployes] = useState(false);

  const [formulaire, setFormulaire] = useState({
    entreprise: '',
    employe: '',
    titre: '',
    description: '',
    categorie: '',
    serviceConcerne: '',
    sousCategorie: '',
    priorite: 'normale',
  });

  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
    }
  }, []);

  // Charger les entreprises
  useEffect(() => {
    const chargerEntreprises = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeEntreprises.php`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success) {
          setEntreprises(data.entreprises || []);
        } else {
          toast.error('Erreur lors du chargement des entreprises');
        }
      } catch (error) {
        console.error('Erreur chargement entreprises:', error);
        toast.error('Erreur de connexion');
      }
    };

    if (user) {
      chargerEntreprises();
    }
  }, [user]);

  // Charger les employés quand une entreprise est sélectionnée
  useEffect(() => {
    const chargerEmployes = async () => {
      if (!formulaire.entreprise) {
        setEmployes([]);
        return;
      }

      setChargementEmployes(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/listeUtilisateursParEntreprise.php?idEntreprise=${formulaire.entreprise}`,
          {
            credentials: 'include',
          }
        );
        const data = await response.json();
        if (data.success) {
          setEmployes(data.utilisateurs || []);
        } else {
          toast.error('Erreur lors du chargement des employés');
          setEmployes([]);
        }
      } catch (error) {
        console.error('Erreur chargement employés:', error);
        toast.error('Erreur de connexion');
        setEmployes([]);
      } finally {
        setChargementEmployes(false);
      }
    };

    chargerEmployes();
  }, [formulaire.entreprise]);

  // Charger les services
  useEffect(() => {
    const chargerServices = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeServicesPublic.php`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success && data.services) {
          setServices(data.services);
        }
      } catch (error) {
        console.error('Erreur chargement services:', error);
      }
    };

    chargerServices();
  }, []);

  // Charger les catégories quand un service est sélectionné
  useEffect(() => {
    const chargerCategories = async () => {
      if (!formulaire.serviceConcerne) {
        setCategories([]);
        setSousCategories([]);
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getCategoriesByService.php?idService=${formulaire.serviceConcerne}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success) {
          setCategories(data.categories);
          setSousCategories(data.sousCategories.map((sc: any) => sc.nomSousCategorie));
        }
      } catch (error) {
        console.error('Erreur chargement catégories:', error);
        setCategories([]);
        setSousCategories([]);
      }
      setFormulaire((prev) => ({ ...prev, categorie: '', sousCategorie: '' }));
    };

    chargerCategories();
  }, [formulaire.serviceConcerne]);

  // Charger les sous-catégories quand une catégorie est sélectionnée
  useEffect(() => {
    const chargerSousCategories = async () => {
      if (!formulaire.categorie || !formulaire.serviceConcerne) {
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getCategoriesByService.php?idService=${formulaire.serviceConcerne}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success) {
          const sousCategoriesFiltrees = data.sousCategories
            .filter((sc: any) => sc.nomCategorie === formulaire.categorie)
            .map((sc: any) => sc.nomSousCategorie);
          setSousCategories(sousCategoriesFiltrees);
        }
      } catch (error) {
        console.error('Erreur chargement sous-catégories:', error);
        setSousCategories([]);
      }
      setFormulaire((prev) => ({ ...prev, sousCategorie: '' }));
    };

    chargerSousCategories();
  }, [formulaire.categorie, formulaire.serviceConcerne]);

  const gererChangement = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Limite de 75 caractères pour le titre
    if (name === 'titre' && value.length > 75) {
      return;
    }

    setFormulaire({ ...formulaire, [name]: value });
  };

  const gererSoumission = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formulaire.entreprise) {
      toast.error('Veuillez sélectionner une entreprise');
      return;
    }

    if (!formulaire.employe) {
      toast.error('Veuillez sélectionner un employé');
      return;
    }

    if (formulaire.titre.length > 75) {
      toast.error('Le titre du ticket ne peut pas dépasser 75 caractères');
      return;
    }

    setChargement(true);

    try {
      // Récupérer les informations de l'employé sélectionné
      const employeSelectionne = employes.find((emp) => emp.idUtilisateur === parseInt(formulaire.employe));
      if (!employeSelectionne) {
        toast.error('Employé non trouvé');
        setChargement(false);
        return;
      }

      // Créer le FormData pour l'envoi
      const formData = new FormData();
      formData.append('titre', formulaire.titre);
      formData.append('description', formulaire.description);
      formData.append('categorie', formulaire.categorie);
      formData.append('serviceConcerne', formulaire.serviceConcerne);
      formData.append('sousCategorie', formulaire.sousCategorie || '');
      formData.append('priorite', formulaire.priorite);
      formData.append('idUtilisateur', formulaire.employe);
      formData.append('creerParTechnicien', 'true');
      formData.append('idTechnicien', user.idTechnicien || user.id);

      // Ajouter les fichiers
      files.forEach((file) => {
        formData.append('files[]', file);
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ajouterTicket.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Ticket créé avec succès !');
        setTimeout(() => {
          router.push('/technicien/tickets');
        }, 1500);
      } else {
        toast.error(data.error || 'Erreur lors de la création du ticket');
      }
    } catch (error) {
      console.error('Erreur création ticket:', error);
      toast.error('Erreur de connexion');
    } finally {
      setChargement(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout role="technicien">
        <p className="text-slate-500 text-sm">Chargement...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="technicien">
      <PageHeader
        title="Créer un ticket"
        description="Créez un ticket au nom d'un employé ou d'un admin référent. Sélectionnez obligatoirement une entreprise et un employé."
        actions={
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => router.push('/technicien/tickets')}>
            Retour
          </Button>
        }
      />

      <Card className="max-w-3xl">
        <CardBody>
          <form onSubmit={gererSoumission} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Entreprise" required>
                <Select name="entreprise" value={formulaire.entreprise} onChange={gererChangement} required>
                  <option value="">-- Sélectionner une entreprise --</option>
                  {entreprises.map((entreprise) => (
                    <option key={entreprise.idEntreprise} value={entreprise.idEntreprise}>
                      {entreprise.nomEntreprise}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Employé / Admin référent" required>
                <Select
                  name="employe"
                  value={formulaire.employe}
                  onChange={gererChangement}
                  required
                  disabled={!formulaire.entreprise || chargementEmployes}
                >
                  <option value="">
                    {!formulaire.entreprise
                      ? "-- Sélectionnez d'abord une entreprise --"
                      : chargementEmployes
                      ? 'Chargement des employés...'
                      : '-- Sélectionner un employé --'}
                  </option>
                  {employes.map((employe) => (
                    <option key={employe.idUtilisateur} value={employe.idUtilisateur}>
                      {employe.prenomUtilisateur} {employe.nomUtilisateur} ({employe.roleEntreprise === 'admin' ? 'Admin référent' : 'Employé'})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Titre du ticket" required>
              <Input type="text" name="titre" value={formulaire.titre} onChange={gererChangement} required maxLength={75} />
              <p className={`text-xs mt-1 ${formulaire.titre.length > 70 ? 'text-red-600' : 'text-slate-500'}`}>
                {formulaire.titre.length}/75 caractères
              </p>
            </Field>

            <Field label="Description" required>
              <Textarea name="description" value={formulaire.description} onChange={gererChangement} required rows={6} />
            </Field>

            <Field label="Service concerné" required>
              <Select name="serviceConcerne" value={formulaire.serviceConcerne} onChange={gererChangement} required>
                <option value="">-- Sélectionner un service --</option>
                {services.map((service) => (
                  <option key={service.idService} value={service.idService}>
                    {service.nomService} ({service.heureDebut} - {service.heureFin})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Catégorie" required>
                <Select name="categorie" value={formulaire.categorie} onChange={gererChangement} required disabled={!formulaire.serviceConcerne}>
                  <option value="">{!formulaire.serviceConcerne ? "-- Sélectionnez d'abord un service --" : '-- Sélectionner une catégorie --'}</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Sous-catégorie" required>
                <Select name="sousCategorie" value={formulaire.sousCategorie} onChange={gererChangement} required disabled={!formulaire.categorie}>
                  <option value="">
                    {!formulaire.categorie ? "-- Sélectionnez d'abord une catégorie --" : '-- Sélectionner une sous-catégorie --'}
                  </option>
                  {sousCategories.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Priorité" required>
              <Select name="priorite" value={formulaire.priorite} onChange={gererChangement} required>
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </Select>
            </Field>

            <Field label="Pièces jointes (optionnel)">
              <Input
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.csv"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="h-auto py-2"
              />
              {files.length > 0 && (
                <div className="text-sm text-brand-600 mt-2">
                  <p className="font-medium">{files.length} fichier(s) sélectionné(s) :</p>
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 mt-1 text-slate-600">
                      <Paperclip size={13} /> {file.name} ({Math.round(file.size / 1024)} KB)
                    </div>
                  ))}
                </div>
              )}
            </Field>

            <Button type="submit" variant="primary" loading={chargement} className="w-full mt-2">
              {chargement ? 'Création en cours...' : 'Créer le ticket'}
            </Button>
          </form>
        </CardBody>
      </Card>

      <ToastContainer position="top-right" autoClose={5000} theme="light" />
    </DashboardLayout>
  );
}
