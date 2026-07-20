'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { Field, Input } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const ReinitialiserMotDePasse: React.FC = () => {
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, []);

  const motDePasseOublie = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setSucces(false);
      setMessage('Lien de réinitialisation invalide.');
      return;
    }

    setChargement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/reinitialiserMotDePasse.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          nouveauMotDePasse,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setSucces(false);
        setMessage(data.error || 'Une erreur est survenue.');
        setChargement(false);
        return;
      }

      setSucces(true);
      setMessage('Mot de passe réinitialisé avec succès. Redirection vers la connexion...');
      setTimeout(() => router.push('/connexion'), 2000);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation :', error);
      setSucces(false);
      setMessage('Une erreur est survenue.');
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-lg mb-4">
            L
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Nouveau mot de passe</h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <form onSubmit={motDePasseOublie} className="flex flex-col gap-4">
            <Field label="Nouveau mot de passe" htmlFor="nouveauMotDePasse">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="nouveauMotDePasse"
                  type="password"
                  placeholder="8 caractères minimum"
                  value={nouveauMotDePasse}
                  onChange={(e) => setNouveauMotDePasse(e.target.value)}
                  className="pl-9"
                  minLength={8}
                  required
                />
              </div>
            </Field>

            {message && (
              <div
                className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
                  succes ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {succes ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {message}
              </div>
            )}

            <Button type="submit" variant="primary" loading={chargement} className="w-full">
              Réinitialiser le mot de passe
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReinitialiserMotDePasse;
