'use client';

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Field, Input } from './ui/Input';
import Button from './ui/Button';

export default function ChangerMotDePasseModal({
  onClose,
  obligatoire = false,
}: {
  onClose: () => void;
  /** Empêche la fermeture tant que le mot de passe n'a pas été changé (ex : mot de passe temporaire imposé à la création du compte). */
  obligatoire?: boolean;
}) {
  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');

    if (nouveauMotDePasse.length < 8) {
      setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (nouveauMotDePasse !== confirmation) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setEnvoi(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/changerMotDePasse.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motDePasseActuel, nouveauMotDePasse }),
      });
      const data = await res.json();

      if (data.success) {
        setSucces(true);
      } else {
        setErreur(data.error || 'Erreur lors du changement de mot de passe.');
      }
    } catch (err) {
      console.error('Erreur changement mot de passe:', err);
      setErreur('Erreur de connexion au serveur.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={obligatoire ? undefined : onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {!obligatoire && (
          <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        )}
        <h2 className={`text-lg font-semibold text-slate-900 ${obligatoire && !succes ? 'mb-1' : 'mb-5'}`}>Changer le mot de passe</h2>
        {obligatoire && !succes && (
          <p className="text-sm text-slate-500 mb-4">
            Pour votre sécurité, vous devez choisir un nouveau mot de passe avant de continuer.
          </p>
        )}

        {succes ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
            <p className="text-sm text-slate-700">Votre mot de passe a été mis à jour avec succès.</p>
            <Button variant="primary" onClick={onClose} className="mt-2">Fermer</Button>
          </div>
        ) : (
          <form onSubmit={soumettre} className="flex flex-col gap-4">
            <Field label="Mot de passe actuel" htmlFor="motDePasseActuel" required>
              <Input
                id="motDePasseActuel"
                type="password"
                value={motDePasseActuel}
                onChange={(e) => setMotDePasseActuel(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>
            <Field label="Nouveau mot de passe" htmlFor="nouveauMotDePasse" required>
              <Input
                id="nouveauMotDePasse"
                type="password"
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirmer le nouveau mot de passe" htmlFor="confirmation" required>
              <Input
                id="confirmation"
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>

            {erreur && (
              <div className="flex items-center gap-2 text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">
                <AlertCircle size={16} /> {erreur}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-1">
              {!obligatoire && (
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              )}
              <Button type="submit" variant="primary" loading={envoi}>Changer le mot de passe</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
