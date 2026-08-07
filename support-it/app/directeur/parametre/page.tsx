'use client';

import React, { useState, useEffect } from 'react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import { Check, Save, Link2, Copy, RefreshCw, MonitorPlay } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const STORAGE_KEY = 'lyovatech_parametres';

const defaults = {
  notifEmail: true,
  notifTicketNouveau: true,
  notifTicketUrgent: true,
  notifResolution: false,
  autoAssign: false,
  delaiRelance: '48',
  compacteMode: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export default function ParametrePage() {
  useAuthRedirect();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState(defaults);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');

  const [tokenAffichage, setTokenAffichage] = useState<string | null>(null);
  const [regenerationEnCours, setRegenerationEnCours] = useState(false);
  const [lienCopie, setLienCopie] = useState(false);

  const lienAffichagePublic = tokenAffichage && typeof window !== 'undefined'
    ? `${window.location.origin}/ecran-affichage/${tokenAffichage}`
    : '';

  const chargerLienAffichage = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getLienAffichage.php`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.token) setTokenAffichage(data.token);
      })
      .catch((e) => console.error('Erreur chargement lien affichage:', e));
  };

  const regenererLienAffichage = async () => {
    if (!confirm('Régénérer le lien invalidera immédiatement l\'ancien lien. Continuer ?')) return;
    setRegenerationEnCours(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/regenererLienAffichage.php`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.token) {
        setTokenAffichage(data.token);
      } else {
        setErreur(data.error || 'Erreur lors de la régénération du lien.');
      }
    } catch (e) {
      setErreur('Erreur de connexion au serveur.');
    } finally {
      setRegenerationEnCours(false);
    }
  };

  const copierLienAffichage = async () => {
    if (!lienAffichagePublic) return;
    try {
      await navigator.clipboard.writeText(lienAffichagePublic);
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2000);
    } catch (e) {
      console.error('Erreur lors de la copie du lien:', e);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    setSettings(loadSettings());

    // Les réglages "serveur" (notifications, assignation auto, délai de
    // relance) sont appliqués côté backend : le localStorage n'est qu'un
    // cache d'affichage, la base de données fait foi.
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getParametresPlateforme.php`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.parametres) {
          const p = data.parametres;
          setSettings((s) => ({
            ...s,
            notifEmail: !!Number(p.notifEmail),
            notifTicketNouveau: !!Number(p.notifTicketNouveau),
            notifTicketUrgent: !!Number(p.notifTicketUrgent),
            notifResolution: !!Number(p.notifResolution),
            autoAssign: !!Number(p.autoAssign),
            delaiRelance: String(p.delaiRelanceHeures),
          }));
        }
      })
      .catch((e) => console.error('Erreur chargement paramètres plateforme:', e));

    chargerLienAffichage();
  }, []);

  const set = (key: string, value: any) => {
    setSettings(s => ({ ...s, [key]: value }));
    setHasChanges(true);
  };

  const sauvegarder = async () => {
    setEnregistrement(true);
    setErreur('');

    // Persister tous les paramètres (cache local + préférences purement client)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    // Mode compact
    localStorage.setItem('compact_mode', settings.compacteMode ? '1' : '0');
    window.dispatchEvent(new Event('compactModeChanged'));

    // Réglages serveur : notifications, assignation auto, délai de relance
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/modifierParametresPlateforme.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifEmail: settings.notifEmail,
          notifTicketNouveau: settings.notifTicketNouveau,
          notifTicketUrgent: settings.notifTicketUrgent,
          notifResolution: settings.notifResolution,
          autoAssign: settings.autoAssign,
          delaiRelanceHeures: settings.delaiRelance,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErreur(data.error || 'Erreur lors de l\'enregistrement des paramètres serveur.');
        setEnregistrement(false);
        return;
      }
    } catch (e) {
      setErreur('Erreur de connexion au serveur.');
      setEnregistrement(false);
      return;
    }

    setEnregistrement(false);
    setHasChanges(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const reinitialiser = () => {
    if (!confirm('Réinitialiser tous les paramètres par défaut ?')) return;
    setSettings({ ...defaults });
    setHasChanges(true);
  };

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title="Paramètres"
        description="Configurez les préférences de la plateforme et les notifications."
      />

      <div className="max-w-3xl flex flex-col gap-4">
        {/* Interface */}
        <Card>
          <CardHeader>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interface</h3>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-slate-100">
            <SettingRow
              label="Mode compact"
              desc="Réduit les espaces et la taille des éléments"
            >
              <Toggle checked={settings.compacteMode} onChange={() => set('compacteMode', !settings.compacteMode)} />
            </SettingRow>
          </CardBody>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notifications</h3>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-slate-100">
            {([
              { key: 'notifEmail', label: 'Notifications par email', desc: 'Email pour chaque événement important' },
              { key: 'notifTicketNouveau', label: 'Nouveau ticket', desc: 'Alerte à chaque création de ticket' },
              { key: 'notifTicketUrgent', label: 'Ticket urgent', desc: 'Alerte immédiate pour les tickets urgents' },
              { key: 'notifResolution', label: 'Résolution ticket', desc: 'Notifier quand un ticket est résolu/fermé' },
            ] as const).map(({ key, label, desc }) => (
              <SettingRow key={key} label={label} desc={desc}>
                <Toggle checked={settings[key] as boolean} onChange={() => set(key, !settings[key])} />
              </SettingRow>
            ))}
          </CardBody>
        </Card>

        {/* Tickets */}
        <Card>
          <CardHeader>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gestion des tickets</h3>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-slate-100">
            <SettingRow
              label="Assignation automatique"
              desc="Assigner automatiquement au technicien le moins chargé"
            >
              <Toggle checked={settings.autoAssign} onChange={() => set('autoAssign', !settings.autoAssign)} />
            </SettingRow>

            <SettingRow
              label="Délai de relance"
              desc="Relance automatique si un ticket reste sans réponse"
            >
              <Select value={settings.delaiRelance} onChange={e => set('delaiRelance', e.target.value)} className="w-auto h-9">
                <option value="24">24 heures</option>
                <option value="48">48 heures</option>
                <option value="72">72 heures</option>
                <option value="168">1 semaine</option>
              </Select>
            </SettingRow>
          </CardBody>
        </Card>

        {/* Écran d'affichage public */}
        <Card>
          <CardHeader>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
              <MonitorPlay size={14} /> Écran d'affichage public
            </h3>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">
              Ce lien donne accès à l'écran mural (tickets en temps réel) sans connexion — à afficher sur un
              écran physique. Quiconque possède ce lien peut le consulter : ne le partagez qu'aux écrans
              destinés à l'afficher, et régénérez-le si vous pensez qu'il a fuité.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[240px] flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <Link2 size={14} className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-600 truncate">
                  {lienAffichagePublic || 'Génération du lien...'}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Copy size={14} />}
                disabled={!lienAffichagePublic}
                onClick={copierLienAffichage}
              >
                {lienCopie ? 'Copié !' : 'Copier'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={14} />}
                disabled={regenerationEnCours}
                onClick={regenererLienAffichage}
              >
                {regenerationEnCours ? 'Régénération...' : 'Régénérer'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Zone danger */}
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="border-red-200">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-red-600">Zone dangereuse</h3>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-red-700">Réinitialiser les paramètres</p>
                <p className="text-xs text-slate-500 mt-0.5">Restaurer tous les paramètres par défaut</p>
              </div>
              <Button variant="danger" onClick={reinitialiser}>Réinitialiser</Button>
            </div>
          </CardBody>
        </Card>

        {/* Sauvegarder */}
        <div className="flex justify-end items-center gap-4">
          {erreur && <span className="text-xs text-red-600">{erreur}</span>}
          {hasChanges && !saved && !erreur && (
            <span className="text-xs text-slate-500">Modifications non sauvegardées</span>
          )}
          <Button
            variant={saved ? 'success' : 'primary'}
            onClick={sauvegarder}
            disabled={enregistrement}
            icon={saved ? <Check size={16} /> : hasChanges ? <Save size={16} /> : undefined}
          >
            {enregistrement ? 'Enregistrement...' : saved ? 'Sauvegardé !' : hasChanges ? 'Sauvegarder' : 'Paramètres à jour'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="inline-flex items-center relative w-11 h-6 cursor-pointer shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <span
        className={`absolute inset-0 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-slate-200'}`}
      />
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </label>
  );
}
