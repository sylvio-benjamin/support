'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, User as UserIcon } from 'lucide-react';
import { authService, LoginResponse } from '../../../services/api';
import { Field, Input } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

// Même correspondance rôle -> section que AppShell.tsx et middleware.ts :
// il faut rediriger vers une section que le rôle a le droit de voir, sinon
// AppShell/middleware renvoient aussitôt vers /connexion (boucle de redirection).
const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  referent: '/admin',
  directeur: '/directeur',
  technicien: '/technicien',
  employe: '/employe',
  utilisateur: '/employe',
};

const PageConnexion = () => {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [typeCompte, setTypeCompte] = useState<'technicien' | 'utilisateur'>('technicien');
  const [message, setMessage] = useState('');
  const [succes, setSucces] = useState(false);
  const [chargement, setChargement] = useState(false);

  const gererSoumission = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setChargement(true);

    try {
      const response: LoginResponse = await authService.login(identifiant, motDePasse, typeCompte);

      if (response.success) {
        setSucces(true);
        setMessage('Connexion réussie, redirection...');

        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          localStorage.setItem('userType', response.type || '');
          localStorage.setItem('userRole', response.role || 'standard');
        }

        // Redirection selon le rôle réel de l'utilisateur (pas son type de
        // compte : un compte "technicien" peut avoir le rôle referent/directeur).
        setTimeout(() => {
          window.location.href = ROLE_HOME[response.role || ''] || '/employe';
        }, 600);
      } else {
        setSucces(false);
        setMessage(response.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setSucces(false);
      setMessage('Erreur de connexion au serveur');
    } finally {
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
          <h1 className="text-xl font-semibold text-slate-900">LyovaTech Support</h1>
          <p className="text-sm text-slate-500 mt-1">Connectez-vous à votre espace</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <div className="flex gap-2 mb-5 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setTypeCompte('technicien')}
              className={`flex-1 h-9 rounded text-sm font-medium transition-colors ${
                typeCompte === 'technicien' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Technicien
            </button>
            <button
              type="button"
              onClick={() => setTypeCompte('utilisateur')}
              className={`flex-1 h-9 rounded text-sm font-medium transition-colors ${
                typeCompte === 'utilisateur' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Employé
            </button>
          </div>

          <form onSubmit={gererSoumission} className="flex flex-col gap-4">
            <Field label="Identifiant" htmlFor="identifiant">
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="identifiant"
                  type="text"
                  placeholder="Votre identifiant"
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="username"
                />
              </div>
            </Field>

            <Field label="Mot de passe" htmlFor="motDePasse">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="motDePasse"
                  type="password"
                  placeholder="********"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="current-password"
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

            <Button type="submit" variant="primary" loading={chargement} className="w-full mt-1">
              {chargement ? 'Connexion...' : 'Se connecter'}
            </Button>

            <a href="/mdp-oublie" className="text-sm text-brand-600 hover:text-brand-700 text-center">
              Mot de passe oublié ?
            </a>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} LyovaTech — Système de ticketing interne
        </p>
      </div>
    </div>
  );
};

export default PageConnexion;
