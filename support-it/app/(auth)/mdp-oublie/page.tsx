'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Field, Input } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const PageMotDePasseOublie = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const gererSoumission = async (e: React.FormEvent) => {
    e.preventDefault();
    setChargement(true);
    setMessage('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/demanderReinitialisationMotDePasse.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage(data.error || "Erreur lors de l'envoi de l'email de récupération");
        setChargement(false);
        return;
      }

      setEnvoye(true);
      setMessage('Un email de récupération a été envoyé à votre adresse email.');
      setChargement(false);
    } catch (err) {
      console.error("Erreur lors de l'envoi:", err);
      setMessage("Erreur lors de l'envoi de l'email de récupération");
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/images/logo_lyo-removebg-preview.png" alt="LyovaTech" className="w-11 h-11 object-contain mb-4" />
          <h1 className="text-xl font-semibold text-slate-900">Mot de passe oublié</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Entrez votre adresse email pour recevoir un lien de récupération.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          {envoye ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={22} />
              </div>
              <p className="text-sm text-slate-700">{message}</p>
              <a href="/connexion/entreprise" className="text-sm text-brand-600 hover:text-brand-700 mt-2">
                Retour à la connexion
              </a>
            </div>
          ) : (
            <form onSubmit={gererSoumission} className="flex flex-col gap-4">
              <Field label="Adresse email" htmlFor="email">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@entreprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </Field>

              {message && (
                <div className="flex items-center gap-2 text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">
                  <AlertCircle size={16} />
                  {message}
                </div>
              )}

              <Button type="submit" variant="primary" loading={chargement} icon={<KeyRound size={16} />} className="w-full">
                {chargement ? 'Envoi en cours...' : 'Envoyer le lien'}
              </Button>

              <a href="/connexion/entreprise" className="text-sm text-brand-600 hover:text-brand-700 text-center">
                Retour à la connexion
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageMotDePasseOublie;
