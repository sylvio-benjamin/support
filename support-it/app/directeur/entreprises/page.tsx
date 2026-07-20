'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Users, CheckCircle2, Ban, Plus, Search, Pencil, Trash2, Power, X } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Field, Input, Textarea } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';

const emptyForm = {
  nomEntreprise: '',
  acronymeEntreprise: '',
  categorie: '',
  pays: '',
  ville: '',
  adresseCourte: '',
  adresseComplete: '',
};

export default function EntreprisesDirecteur() {
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [loadingAction, setLoadingAction] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modeEdition, setModeEdition] = useState(false);
  const [entrepriseSelectionnee, setEntrepriseSelectionnee] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const chargerEntreprises = async () => {
    setChargement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeEntreprisesCompletes.php`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.entreprises) {
        setEntreprises(data.entreprises);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des entreprises:', error);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerEntreprises();
  }, []);

  const entreprisesFiltrees = entreprises.filter((e) => {
    const q = recherche.toLowerCase();
    return (
      q === '' ||
      e.nomEntreprise?.toLowerCase().includes(q) ||
      e.acronymeEntreprise?.toLowerCase().includes(q) ||
      e.ville?.toLowerCase().includes(q) ||
      e.pays?.toLowerCase().includes(q) ||
      e.categorie?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: entreprises.length,
    actives: entreprises.filter((e) => !e.desactiver).length,
    desactivees: entreprises.filter((e) => e.desactiver).length,
    utilisateurs: entreprises.reduce((sum, e) => sum + (parseInt(e.nombreUtilisateurs) || 0), 0),
  };

  const statCards = [
    { label: 'Entreprises', value: stats.total, icon: <Building2 size={18} /> },
    { label: 'Actives', value: stats.actives, icon: <CheckCircle2 size={18} /> },
    { label: 'Désactivées', value: stats.desactivees, icon: <Ban size={18} /> },
    { label: 'Utilisateurs au total', value: stats.utilisateurs, icon: <Users size={18} /> },
  ];

  const ouvrirModal = (entreprise?: any) => {
    setFormError('');
    if (entreprise) {
      setModeEdition(true);
      setEntrepriseSelectionnee(entreprise);
      setForm({
        nomEntreprise: entreprise.nomEntreprise || '',
        acronymeEntreprise: entreprise.acronymeEntreprise || '',
        categorie: entreprise.categorie || '',
        pays: entreprise.pays || '',
        ville: entreprise.ville || '',
        adresseCourte: entreprise.adresse || '',
        adresseComplete: entreprise.adresseComplete || '',
      });
    } else {
      setModeEdition(false);
      setEntrepriseSelectionnee(null);
      setForm(emptyForm);
    }
    setShowModal(true);
  };

  const fermerModal = () => {
    setShowModal(false);
    setEntrepriseSelectionnee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const url = modeEdition
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/modifierEntreprise.php`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/inscriptionEntreprise.php`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          idEntreprise: modeEdition ? entrepriseSelectionnee.idEntreprise : undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        fermerModal();
        chargerEntreprises();
      } else {
        setFormError(data.error || 'Erreur lors de l\'enregistrement.');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setFormError('Erreur de connexion au serveur.');
    } finally {
      setSaving(false);
    }
  };

  const toggleEntreprise = async (idEntreprise: number, action: 'desactiver' | 'activer') => {
    const message = action === 'desactiver'
      ? 'Êtes-vous sûr de vouloir désactiver cette entreprise ? Tous ses utilisateurs ne pourront plus se connecter.'
      : 'Êtes-vous sûr de vouloir activer cette entreprise ?';
    if (!confirm(message)) return;

    setLoadingAction(idEntreprise);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/desactiverEntreprise.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idEntreprise, action }),
      });
      const data = await res.json();
      if (data.success) {
        chargerEntreprises();
      } else {
        alert('Erreur : ' + (data.error || 'Erreur lors de l\'opération'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion lors de l\'opération');
    } finally {
      setLoadingAction(null);
    }
  };

  const supprimerEntreprise = async (idEntreprise: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ? Cette action est irréversible.')) return;

    setLoadingAction(idEntreprise);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/supprimerEntreprise.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idEntreprise }),
      });
      const data = await res.json();
      if (data.success) {
        chargerEntreprises();
      } else {
        alert('Erreur : ' + (data.error || 'Erreur lors de la suppression'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion lors de la suppression');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title="Gestion des entreprises"
        description="Créez, modifiez et gérez les entreprises clientes de la plateforme."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => ouvrirModal()}>
            Ajouter une entreprise
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
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Rechercher une entreprise..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        {chargement ? (
          <p className="text-sm text-slate-500 text-center py-16">Chargement des entreprises...</p>
        ) : entreprisesFiltrees.length === 0 ? (
          <EmptyState
            icon={<Building2 size={22} />}
            title={entreprises.length === 0 ? 'Pas d\'entreprise enregistrée' : 'Aucune entreprise trouvée'}
            description={
              entreprises.length === 0
                ? "Aucune entreprise cliente n'a encore été créée."
                : 'Aucune entreprise ne correspond à votre recherche.'
            }
          />
        ) : (
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
                {entreprisesFiltrees.map((entreprise) => (
                  <tr key={entreprise.idEntreprise} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
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
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => ouvrirModal(entreprise)}>
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant={entreprise.desactiver ? 'success' : 'secondary'}
                          icon={<Power size={14} />}
                          onClick={() => toggleEntreprise(entreprise.idEntreprise, entreprise.desactiver ? 'activer' : 'desactiver')}
                          disabled={loadingAction === entreprise.idEntreprise}
                        >
                          {entreprise.desactiver ? 'Activer' : 'Désactiver'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Trash2 size={14} />}
                          onClick={() => supprimerEntreprise(entreprise.idEntreprise)}
                          disabled={loadingAction === entreprise.idEntreprise}
                        >
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

      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4" onClick={fermerModal}>
          <div
            className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {modeEdition ? `Modifier ${entrepriseSelectionnee?.nomEntreprise}` : 'Ajouter une entreprise'}
              </h2>
              <button onClick={fermerModal} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Nom de l'entreprise" htmlFor="nomEntreprise" required>
                <Input
                  id="nomEntreprise"
                  type="text"
                  placeholder="Ex: TechCorp Solutions"
                  required
                  value={form.nomEntreprise}
                  onChange={(e) => setForm({ ...form, nomEntreprise: e.target.value })}
                />
              </Field>
              <Field label="Acronyme" htmlFor="acronymeEntreprise">
                <Input
                  id="acronymeEntreprise"
                  type="text"
                  placeholder="Ex: TCS"
                  maxLength={10}
                  value={form.acronymeEntreprise}
                  onChange={(e) => setForm({ ...form, acronymeEntreprise: e.target.value })}
                />
              </Field>
              <Field label="Catégorie" htmlFor="categorie">
                <Input
                  id="categorie"
                  type="text"
                  placeholder="Ex: Technologie, Finance..."
                  maxLength={50}
                  value={form.categorie}
                  onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Pays" htmlFor="pays" required>
                  <Input
                    id="pays"
                    type="text"
                    placeholder="Ex: France"
                    required
                    maxLength={50}
                    value={form.pays}
                    onChange={(e) => setForm({ ...form, pays: e.target.value })}
                  />
                </Field>
                <Field label="Ville" htmlFor="ville" required>
                  <Input
                    id="ville"
                    type="text"
                    placeholder="Ex: Paris"
                    required
                    maxLength={50}
                    value={form.ville}
                    onChange={(e) => setForm({ ...form, ville: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Adresse (courte)" htmlFor="adresseCourte">
                <Input
                  id="adresseCourte"
                  type="text"
                  placeholder="Ex: 10 rue de la Paix"
                  maxLength={100}
                  value={form.adresseCourte}
                  onChange={(e) => setForm({ ...form, adresseCourte: e.target.value })}
                />
              </Field>
              <Field label="Adresse complète" htmlFor="adresseComplete">
                <Textarea
                  id="adresseComplete"
                  placeholder="Adresse complète de l'entreprise"
                  rows={2}
                  value={form.adresseComplete}
                  onChange={(e) => setForm({ ...form, adresseComplete: e.target.value })}
                />
              </Field>

              {formError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={fermerModal}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
                  {saving ? 'Enregistrement...' : modeEdition ? 'Enregistrer' : 'Créer l\'entreprise'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
