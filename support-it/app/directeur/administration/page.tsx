'use client';

import React, { useState, useEffect } from 'react';
import { Building2, AlertTriangle, Check, Users, Settings, ClipboardList, Ticket } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Field, Input, Select } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import AdresseAutocomplete from '../../../components/AdresseAutocomplete';
import { CATEGORIES_ENTREPRISE, PAYS } from '../../../lib/entrepriseOptions';

function formaterTempsRelatif(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr.replace(' ', 'T'));
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffJ = Math.floor(diffH / 24);
  return `Il y a ${diffJ}j`;
}

export default function AdministrationPage() {
  const [user, setUser] = useState<any>(undefined);
  const [isClient, setIsClient] = useState(false);

  const [statistiques, setStatistiques] = useState<any>(null);
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [activitesRecentes, setActivitesRecentes] = useState<any[]>([]);
  const [chargementStats, setChargementStats] = useState(true);

  const [submitText, setSubmitText] = useState('Ajouter l\'Entreprise');
  const [submitVariant, setSubmitVariant] = useState<'primary' | 'success' | 'danger'>('primary');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const emptyFormData = {
    nomEntreprise: '',
    acronymeEntreprise: '',
    categorie: '',
    pays: 'France',
    ville: '',
    adresse: '',
  };
  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    setIsClient(true);
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userData) setUser(JSON.parse(userData));
    else setUser({ nom: 'Invité', prenom: '', role: 'Directeur' });
  }, []);

  const chargerDonnees = async () => {
    setChargementStats(true);
    try {
      const [statsRes, entreprisesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/statistiquesDashboard.php`, { credentials: 'include' }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeEntreprisesCompletes.php`, { credentials: 'include' }),
      ]);
      const statsData = await statsRes.json();
      const entreprisesData = await entreprisesRes.json();

      if (statsData.success) {
        setStatistiques(statsData.statistiques);
        setActivitesRecentes(statsData.activitesRecentes || []);
      }
      if (entreprisesData.success && entreprisesData.entreprises) {
        setEntreprises(entreprisesData.entreprises);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    } finally {
      setChargementStats(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  if (!isClient || user === undefined) {
    return (
      <DashboardLayout role="directeur">
        <p className="text-sm text-slate-500 text-center py-16">Chargement utilisateur...</p>
      </DashboardLayout>
    );
  }
  if (user === null) {
    if (typeof window !== 'undefined') {
      window.location.href = '/connexion/lyovatech';
    }
    return (
      <DashboardLayout role="directeur">
        <p className="text-sm text-slate-500 text-center py-16">Utilisateur non connecté. Redirection...</p>
      </DashboardLayout>
    );
  }

  const addCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitText('Ajout de l\'entreprise...');
    setSubmitVariant('primary');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/inscriptionEntreprise.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitText('Entreprise ajoutée !');
        setSubmitVariant('success');
        chargerDonnees();
        setFormData(emptyFormData);
      } else {
        setSubmitText('Erreur : ' + (data.error || 'Échec de l\'enregistrement'));
        setSubmitVariant('danger');
      }
    } catch (err) {
      setSubmitText('Erreur de connexion au serveur.');
      setSubmitVariant('danger');
    }
  };

  const safeUser = user && typeof user === 'object'
    ? {
        nom: user.nom || 'Invité',
        prenom: user.prenom || '',
        role: user.role || 'Directeur'
      }
    : { nom: 'Invité', prenom: '', role: 'Directeur' };
  void safeUser; // conservé (utilisé auparavant pour la sidebar, désormais gérée par DashboardLayout)

  // Note: route corrigée — "/directeur/utilisateurs" n'existe pas, la page réelle est "/directeur/utilisateur".
  const showUserManagement = () => window.location.href = '/directeur/utilisateur';
  const showSystemConfig = () => window.location.href = '/directeur/configuration';
  const showReportsCenter = () => window.alert('Ouverture du centre de rapports...');
  const showAddCompany = () => document.getElementById('carte-ajout-entreprise')?.scrollIntoView({ behavior: 'smooth' });
  const resetForm = () => setFormData(emptyFormData);

  const actions = [
    { label: 'Ajouter entreprise', desc: 'Nouvelle entreprise cliente', icon: <Building2 size={24} />, onClick: showAddCompany },
    { label: 'Gestion utilisateurs', desc: 'Gérer les comptes utilisateurs', icon: <Users size={24} />, onClick: showUserManagement },
    { label: 'Configuration', desc: 'Paramètres système', icon: <Settings size={24} />, onClick: showSystemConfig },
    { label: 'Centre rapports', desc: 'Rapports et exports', icon: <ClipboardList size={24} />, onClick: showReportsCenter },
  ];

  const totalEntreprises = statistiques?.entreprises?.total_entreprises ?? entreprises.length;
  const entreprisesActives = entreprises.filter((e) => !e.desactiver).length;
  const pctActives = entreprises.length > 0 ? Math.round((entreprisesActives / entreprises.length) * 1000) / 10 : 0;
  const totalUtilisateurs = statistiques?.utilisateurs?.total_utilisateurs ?? 0;
  const totalTechniciens = statistiques?.techniciens?.total_techniciens ?? 0;
  const totalTickets = statistiques?.tickets?.total_tickets ?? 0;
  const ticketsResolus = statistiques?.tickets?.tickets_resolus ?? 0;

  const entreprisesRecentes = [...entreprises]
    .sort((a, b) => (b.idEntreprise ?? 0) - (a.idEntreprise ?? 0))
    .slice(0, 3);

  const activitesAffichees = activitesRecentes.map((a: any) => ({
    icon: a.priorite === 'urgente' ? AlertTriangle : a.statut === 'resolu' ? Check : Ticket,
    text: `${a.description} — ${a.titre}`,
    time: formaterTempsRelatif(a.date),
  }));

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title="Administration & Gestion"
        description="Tableau de bord pour la gestion et l'administration du système."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {actions.map((a) => (
          <Card key={a.label} className="cursor-pointer hover:border-brand-300" onClick={a.onClick}>
            <CardBody className="flex flex-col items-center text-center gap-2">
              <span className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">{a.icon}</span>
              <p className="text-sm font-semibold text-slate-900">{a.label}</p>
              <p className="text-xs text-slate-500">{a.desc}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Companies Management */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Gestion entreprises</h3>
            <Button size="sm" variant="secondary" onClick={showAddCompany}>+ Ajouter</Button>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric value={chargementStats ? '...' : String(totalEntreprises)} label="Entreprises" />
              <Metric value={chargementStats ? '...' : `${pctActives}%`} label="Actives" />
              <Metric value={chargementStats ? '...' : String(totalUtilisateurs)} label="Utilisateurs" />
              <Metric value={chargementStats ? '...' : String(totalTechniciens)} label="Techniciens" />
            </div>
          </CardBody>
        </Card>

        {/* System Status & Activities */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Activités récentes</h3>
            <Button size="sm" variant="ghost" onClick={() => window.location.href = '/directeur/tickets'}>Voir tout</Button>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-slate-100">
            {chargementStats ? (
              <p className="text-sm text-slate-500 text-center py-6">Chargement...</p>
            ) : activitesAffichees.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Aucune activité ces 7 derniers jours.</p>
            ) : (
              activitesAffichees.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-8 h-8 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <activity.icon size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{activity.text}</p>
                    <p className="text-xs text-slate-400">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Add Company Form */}
        <Card id="carte-ajout-entreprise" className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Ajouter une entreprise</h3>
            <Button size="sm" variant="secondary" type="button" onClick={resetForm}>Réinitialiser</Button>
          </CardHeader>
          <CardBody>
            <form onSubmit={addCompany} className="flex flex-col gap-4">
              <Field label="Nom de l'entreprise" htmlFor="nomEntreprise" required>
                <Input
                  id="nomEntreprise"
                  type="text"
                  name="nomEntreprise"
                  placeholder="Ex: TechCorp Solutions"
                  required
                  value={formData.nomEntreprise}
                  onChange={(e) => setFormData({ ...formData, nomEntreprise: e.target.value })}
                />
              </Field>
              <Field label="Acronyme (facultatif)" htmlFor="acronymeEntreprise">
                <Input
                  id="acronymeEntreprise"
                  type="text"
                  name="acronymeEntreprise"
                  placeholder="Ex: TCS"
                  maxLength={10}
                  value={formData.acronymeEntreprise}
                  onChange={(e) => setFormData({ ...formData, acronymeEntreprise: e.target.value })}
                />
              </Field>
              <Field label="Catégorie" htmlFor="categorie">
                <Select
                  id="categorie"
                  name="categorie"
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                >
                  <option value="">-- Sélectionner --</option>
                  {CATEGORIES_ENTREPRISE.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Pays" htmlFor="pays">
                  <Select
                    id="pays"
                    name="pays"
                    value={formData.pays}
                    onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                  >
                    {PAYS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Ville" htmlFor="ville">
                  <Input
                    id="ville"
                    type="text"
                    name="ville"
                    placeholder="Ex: Paris"
                    maxLength={50}
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Adresse" htmlFor="adresse">
                <AdresseAutocomplete
                  id="adresse"
                  value={formData.adresse}
                  onChange={(adresse) => setFormData({ ...formData, adresse })}
                  onVilleDetectee={(ville) => setFormData((f) => ({ ...f, ville }))}
                  onPaysDetecte={(pays) => setFormData((f) => ({ ...f, pays }))}
                />
              </Field>

              <Button type="submit" variant={submitVariant} className="w-full">
                {submitText}
              </Button>
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  {success}
                </div>
              )}
            </form>
          </CardBody>
        </Card>

        {/* Statistiques Entreprises */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Statistiques entreprises</h3>
            <Button size="sm" variant="ghost" onClick={() => window.location.href = '/directeur/statistiques'}>Exporter</Button>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-2.5">
              <StatCard icon={Users} value={chargementStats ? '...' : String(totalUtilisateurs)} label="Employés" />
              <StatCard icon={Ticket} value={chargementStats ? '...' : String(totalTickets)} label="Tickets" />
              <StatCard icon={Check} value={chargementStats ? '...' : String(ticketsResolus)} label="Tickets résolus" />
            </div>

            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-5 mb-3">Entreprises récemment ajoutées</h4>
            <div className="flex flex-col divide-y divide-slate-100">
              {chargementStats ? (
                <p className="text-sm text-slate-500 text-center py-6">Chargement...</p>
              ) : entreprisesRecentes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Aucune entreprise enregistrée.</p>
              ) : (
                entreprisesRecentes.map((entreprise) => (
                  <div key={entreprise.idEntreprise} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-10 h-10 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0">
                      {(entreprise.acronymeEntreprise || entreprise.nomEntreprise || '').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{entreprise.nomEntreprise}</p>
                      <p className="text-xs text-slate-500 truncate">{entreprise.ville}{entreprise.pays ? `, ${entreprise.pays}` : ''}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                        entreprise.desactiver ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {entreprise.desactiver ? 'Désactivée' : 'Active'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Metric({ value, label }: { value: string, label: string }) {
  return (
    <div className="text-center p-4 rounded-md bg-slate-50 border border-slate-100">
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1.5 font-medium">{label}</div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: React.ComponentType<{ size?: number | string }>, value: string, label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-md bg-brand-50/50 border border-brand-100">
      <span className="w-9 h-9 rounded-md bg-white text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
        <Icon size={18} />
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
