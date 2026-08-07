'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, AlertTriangle, Siren, Calendar, Bell, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const priorities = [
  { key: 'normal', icon: ClipboardList, label: 'Normal', tone: 'success' as const },
  { key: 'important', icon: AlertTriangle, label: 'Important', tone: 'warning' as const },
  { key: 'urgent', icon: Siren, label: 'Urgent', tone: 'danger' as const },
];

const TONE_CLASSES: Record<'success' | 'warning' | 'danger', string> = {
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
};

const quickTimes = ['09:00', '10:00', '14:00', '15:00', '16:00'];

interface WidgetRdvProps {
  onClose?: () => void;
  idTicket?: string | number;
  idUtilisateur?: string | number;
  idTechnicien?: string | number;
}

export default function WidgetRdv({ onClose, idTicket, idUtilisateur, idTechnicien }: WidgetRdvProps) {
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [priority, setPriority] = useState('important');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [rdv, setRdv] = useState<any>(null);
  const [error, setError] = useState('');
  const [titre, setTitre] = useState('');
  const [creneauxSupplementaires, setCreneauxSupplementaires] = useState<{ date: string; heure: string }[]>([]);

  // Charger le RDV existant au chargement du widget
  useEffect(() => {
    if (!idTicket) return;
    const fetchRDV = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRdvByTicket.php?idTicket=${idTicket}`, {
          credentials: 'include',
        });
        const data = await res.json();
        setRdv(data?.success ? data.rdv : null);
      } catch (e) {
        setRdv(null);
      }
    };
    fetchRDV();
  }, [idTicket]);

  const handleQuickTime = (t: string) => setHeure(t);
  const handlePriority = (p: string) => setPriority(p);

  // Créer un RDV
  const handleProposer = async () => {
    setSending(true);
    setMsg('');
    setError('');
    // Vérification des champs obligatoires
    if (!titre || !date || !heure) {
      setError('Merci de remplir tous les champs obligatoires.');
      setSending(false);
      return;
    }
    const creneaux = [
      { date, heure },
      ...creneauxSupplementaires.filter(c => c.date && c.heure),
    ];
    const formData = new FormData();
    formData.append('creneaux', JSON.stringify(creneaux));
    formData.append('Ticket', String(idTicket));
    formData.append('idUtilisateur', String(idUtilisateur));
    formData.append('idTechnicien', String(idTechnicien));
    formData.append('titre', titre);
    formData.append('priorite', priority);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Calendrier.php`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setMsg(creneaux.length > 1 ? 'Créneaux proposés !' : 'RDV proposé !');
        if (typeof onClose === 'function') onClose(); // Ferme la modale après proposition
      } else {
        setError(data?.error || 'Erreur lors de la création du RDV');
      }
    } catch (e) {
      setError('Erreur réseau');
    }
    setSending(false);
  };

  const ajouterCreneauSupplementaire = () => {
    if (creneauxSupplementaires.length >= 2) return; // max 3 créneaux au total
    setCreneauxSupplementaires([...creneauxSupplementaires, { date: '', heure: '' }]);
  };

  const modifierCreneauSupplementaire = (index: number, champ: 'date' | 'heure', valeur: string) => {
    setCreneauxSupplementaires(creneauxSupplementaires.map((c, i) => (i === index ? { ...c, [champ]: valeur } : c)));
  };

  const supprimerCreneauSupplementaire = (index: number) => {
    setCreneauxSupplementaires(creneauxSupplementaires.filter((_, i) => i !== index));
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="relative flex flex-col items-center text-center gap-1">
        <button
          onClick={onClose}
          title="Fermer"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
        >
          <X size={16} />
        </button>
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Calendar size={18} className="text-brand-600" /> Planifier un rendez-vous
        </h3>
        <p className="text-sm text-slate-500">Proposer un créneau pour résoudre le ticket</p>
      </CardHeader>

      <CardBody>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Date" htmlFor="rdv-date">
            <Input id="rdv-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Heure" htmlFor="rdv-heure">
            <Input id="rdv-heure" type="time" value={heure} onChange={e => setHeure(e.target.value)} />
          </Field>
        </div>

        {creneauxSupplementaires.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-4 mb-4 items-end">
            <Field label={`Date (créneau alternatif ${i + 1})`} htmlFor={`rdv-date-alt-${i}`}>
              <Input id={`rdv-date-alt-${i}`} type="date" value={c.date} onChange={e => modifierCreneauSupplementaire(i, 'date', e.target.value)} />
            </Field>
            <Field label="Heure" htmlFor={`rdv-heure-alt-${i}`}>
              <Input id={`rdv-heure-alt-${i}`} type="time" value={c.heure} onChange={e => modifierCreneauSupplementaire(i, 'heure', e.target.value)} />
            </Field>
            <button
              type="button"
              onClick={() => supprimerCreneauSupplementaire(i)}
              title="Retirer ce créneau"
              className="w-9 h-9 rounded-md bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        {creneauxSupplementaires.length < 2 && (
          <button
            type="button"
            onClick={ajouterCreneauSupplementaire}
            className="text-sm font-medium text-brand-600 hover:text-brand-700 mb-5"
          >
            + Proposer un créneau alternatif
          </button>
        )}

        <div className="flex gap-2 flex-wrap mb-5">
          {quickTimes.map(t => (
            <Button key={t} size="sm" variant="secondary" onClick={() => handleQuickTime(t)}>
              {t.replace(':', 'h')}
            </Button>
          ))}
        </div>

        <div className="mb-5">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Priorité du rendez-vous</label>
          <div className="flex gap-2 flex-wrap">
            {priorities.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePriority(p.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${TONE_CLASSES[p.tone]} ${
                  priority === p.key ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                <p.icon size={12} /> {p.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Titre du rendez-vous" htmlFor="titre" required>
          <Input
            id="titre"
            type="text"
            value={titre}
            onChange={e => setTitre(e.target.value)}
            placeholder="Titre du RDV"
            required
          />
        </Field>

        <Button variant="primary" className="w-full mt-5" onClick={handleProposer} loading={sending}>
          {sending ? 'Envoi...' : 'Proposer RDV'}
        </Button>

        {msg && <p className="text-center text-emerald-600 font-medium mt-4">{msg}</p>}
        {error && <p className="text-center text-red-600 font-medium mt-4">{error}</p>}

        {rdv && Object.keys(rdv).length > 0 && (
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-md text-sm">
            <p className="font-semibold text-brand-600 mb-1">RDV existant :</p>
            <p>Date : <strong>{rdv.date}</strong></p>
            <p>Heure : <strong>{rdv.heure}</strong></p>
            <p>
              Statut :{' '}
              <strong className={rdv.Acceptation === 'Accepté' ? 'text-emerald-600' : rdv.Acceptation === 'Refusé' ? 'text-red-600' : 'text-amber-600'}>
                {rdv.Acceptation === 'Accepté' ? 'Confirmé par le client' : rdv.Acceptation === 'Refusé' ? 'Refusé par le client' : 'En attente de confirmation du client'}
              </strong>
            </p>
          </div>
        )}
      </CardBody>

      <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 rounded-b-lg">
        <Bell size={13} /> Le client recevra une notification pour confirmer le rendez-vous
      </div>
    </Card>
  );
}
