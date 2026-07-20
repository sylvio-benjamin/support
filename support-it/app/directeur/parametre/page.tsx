'use client';

import React, { useState, useEffect } from 'react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import { Check, Save } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const STORAGE_KEY = 'lyovatech_parametres';

const defaults = {
  animation3D: true,
  notifEmail: true,
  notifTicketNouveau: true,
  notifTicketUrgent: true,
  notifResolution: false,
  langue: 'fr',
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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    setSettings(loadSettings());
  }, []);

  const set = (key: string, value: any) => {
    setSettings(s => ({ ...s, [key]: value }));
    setHasChanges(true);
  };

  const sauvegarder = () => {
    // Persister tous les paramètres
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    // Animation 3D — déclenche l'événement utilisé par les autres pages
    localStorage.setItem('animation3DActive', settings.animation3D ? 'true' : 'false');
    window.dispatchEvent(new Event('animation3DActiveChanged'));

    // Notifications — stocker pour usage dans les hooks de notification
    localStorage.setItem('notif_email', settings.notifEmail ? '1' : '0');
    localStorage.setItem('notif_ticket_nouveau', settings.notifTicketNouveau ? '1' : '0');
    localStorage.setItem('notif_ticket_urgent', settings.notifTicketUrgent ? '1' : '0');
    localStorage.setItem('notif_resolution', settings.notifResolution ? '1' : '0');

    // Tickets
    localStorage.setItem('auto_assign', settings.autoAssign ? '1' : '0');
    localStorage.setItem('delai_relance', settings.delaiRelance);

    // Mode compact
    document.body.classList.toggle('compact-mode', settings.compacteMode);
    localStorage.setItem('compact_mode', settings.compacteMode ? '1' : '0');

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
              label="Animation 3D des cartes"
              desc="Effet tilt interactif sur les cartes du tableau de bord"
            >
              <Toggle checked={settings.animation3D} onChange={() => set('animation3D', !settings.animation3D)} />
            </SettingRow>

            <SettingRow
              label="Mode compact"
              desc="Réduit les espaces et la taille des éléments"
            >
              <Toggle checked={settings.compacteMode} onChange={() => set('compacteMode', !settings.compacteMode)} />
            </SettingRow>

            <SettingRow
              label="Langue"
              desc="Langue d'affichage de l'interface"
            >
              <Select value={settings.langue} onChange={e => set('langue', e.target.value)} className="w-auto h-9">
                <option value="fr">Français</option>
                <option value="en">English</option>
              </Select>
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
          {hasChanges && !saved && (
            <span className="text-xs text-slate-500">Modifications non sauvegardées</span>
          )}
          <Button
            variant={saved ? 'success' : 'primary'}
            onClick={sauvegarder}
            icon={saved ? <Check size={16} /> : hasChanges ? <Save size={16} /> : undefined}
          >
            {saved ? 'Sauvegardé !' : hasChanges ? 'Sauvegarder' : 'Paramètres à jour'}
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
