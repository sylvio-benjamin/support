'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Cookie, Lock, User as UserIcon } from 'lucide-react';
import { authService, LoginResponse } from '../../../../services/api';
import Button from '../../../../components/ui/Button';

// Même correspondance rôle -> section que AppShell.tsx et middleware.ts :
// il faut rediriger vers une section que le rôle a le droit de voir, sinon
// AppShell/middleware renvoient aussitôt vers /connexion (boucle de redirection).
const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  referent: '/admin',
  directeur: '/directeur',
  technicien: '/technicien',
  employe: '/employe/ticket',
  utilisateur: '/employe/ticket',
};

const COOKIES_STORAGE_KEY = 'lyovatech_cookies_acceptes';

// Cartes décoratives du panneau de marque : illustrent le produit, sans lien
// avec des tickets réels.
const TICKETS_VITRINE = [
  { id: '#4821', statut: 'Urgent', statutClasses: 'text-red-300 bg-red-400/15', titre: 'Serveur mail hors ligne', meta: 'Assigné à J. Martin · SLA 42 min', style: { left: 0, top: 0, width: 300, '--r': '-6deg', animationDuration: '5.5s', animationDelay: '0s' } },
  { id: '#4819', statut: 'En cours', statutClasses: 'text-blue-300 bg-blue-400/15', titre: 'Mise à jour poste comptabilité', meta: 'Assigné à S. Diallo · SLA 3h10', style: { left: 150, top: 140, width: 300, '--r': '4deg', animationDuration: '6.5s', animationDelay: '0.6s' } },
  { id: '#4805', statut: 'Résolu', statutClasses: 'text-emerald-300 bg-emerald-400/15', titre: 'Accès VPN restauré', meta: 'Clôturé en 28 min', style: { left: 20, top: 280, width: 280, '--r': '-3deg', animationDuration: '6s', animationDelay: '1.1s' } },
] as const;

function PanneauMarque() {
  return (
    <div
      className="hidden lg:flex relative flex-[1.15] min-w-0 flex-col justify-center overflow-hidden px-16 py-18"
      style={{ background: 'radial-gradient(900px 700px at 15% 10%, #241a45 0%, #14102b 55%, #0b0820 100%)' }}
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(167,139,250,0.18) 1.4px, transparent 1.4px)',
          backgroundSize: '34px 34px',
        }}
      />
      <div className="absolute -top-40 -right-36 w-[480px] h-[480px] rounded-full blur-[2px]" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35), rgba(124,58,237,0) 70%)' }} />
      <div className="absolute -bottom-52 -left-32 w-[440px] h-[440px] rounded-full blur-[2px]" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.16), rgba(56,189,248,0) 70%)' }} />

      <div className="relative flex items-center gap-3 mb-14">
        <img src="/images/logo_lyo-removebg-preview.png" alt="LyovaTech" className="w-9 h-9 object-contain" />
        <span className="text-[19px] font-extrabold tracking-tight text-[#f2eeff]">LyovaTech</span>
      </div>

      <div className="relative">
        <p className="mb-3.5 uppercase tracking-[0.14em] text-[12.5px] font-bold text-[#a78bfa]">
          Système de ticketing interne
        </p>
        <h1 className="max-w-[520px] text-[42px] leading-[1.15] font-extrabold tracking-tight text-[#fdfcff]">
          Chaque incident suivi, du premier signalement à la résolution.
        </h1>
        <p className="mt-5 max-w-[460px] text-[16.5px] leading-relaxed text-[#c3bce0]">
          Priorisez, assignez et suivez les SLA en temps réel, techniciens, référents et direction, sur un même fil.
        </p>
      </div>

      <div className="relative mt-14 h-[390px]">
        {TICKETS_VITRINE.map((t) => (
          <div
            key={t.id}
            className="absolute rounded-2xl border border-[#a78bfa]/25 bg-[#1b1638] p-5 shadow-[0_20px_40px_-18px_rgba(0,0,0,0.55)]"
            style={{ ...t.style, animationName: 'floatCard', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' } as React.CSSProperties}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${t.statutClasses}`}>{t.statut}</span>
              <span className="text-xs text-[#8a83ad]">{t.id}</span>
            </div>
            <p className="text-[14.5px] font-semibold text-[#f1eefb]">{t.titre}</p>
            <p className="mt-1.5 text-[12.5px] text-[#8a83ad]">{t.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BanniereCookies() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIES_STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed left-4 right-4 bottom-4 z-20 mx-auto flex max-w-3xl flex-col items-stretch gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_20px_48px_-18px_rgba(15,18,34,0.25)] sm:left-6 sm:right-6 sm:bottom-6 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3 min-w-0 sm:flex-1">
        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-brand-600/10">
          <Cookie size={18} className="text-brand-600" />
        </div>
        <p className="min-w-0 text-[13.5px] leading-relaxed text-slate-600">
          LyovaTech n&apos;utilise que des cookies <strong className="text-slate-800">strictement nécessaires</strong> (connexion sécurisée, préférences). Aucun cookie publicitaire, aucun suivi.{' '}
          <a href="/politique-cookies" className="text-brand-600 hover:underline">En savoir plus</a>.
        </p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(COOKIES_STORAGE_KEY, '1');
          setVisible(false);
        }}
        className="shrink-0 rounded-lg bg-brand-600 px-4.5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
      >
        J&apos;ai compris
      </button>
    </div>
  );
}

interface FormulaireConnexionProps {
  // 'technicien' = espace interne LyovaTech (techniciens/directeurs) ;
  // 'utilisateur' = espace entreprise cliente (employés/admins référents).
  typeCompte: 'technicien' | 'utilisateur';
  titre: string;
  sousTitre?: string;
  lienAutreEspace: { href: string; label: string };
}

export default function FormulaireConnexion({ typeCompte, titre, sousTitre, lienAutreEspace }: FormulaireConnexionProps) {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [siteWeb, setSiteWeb] = useState(''); // honeypot anti-bot, doit rester vide
  const [message, setMessage] = useState('');
  const [succes, setSucces] = useState(false);
  const [chargement, setChargement] = useState(false);

  const gererSoumission = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setChargement(true);

    try {
      const response: LoginResponse = await authService.login(identifiant, motDePasse, typeCompte, siteWeb);

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
    <div className="min-h-screen flex bg-[#f4f4fa]">
      <PanneauMarque />

      <div className="flex flex-1 lg:flex-none lg:w-[480px] items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="flex flex-col items-center mb-8 text-center">
            <img src="/images/logo_lyo-removebg-preview.png" alt="LyovaTech" className="mb-4.5 w-9 h-9 object-contain" />
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{titre}</h2>
            <p className="mt-2 text-[14.5px] text-slate-500">{sousTitre || 'Connectez-vous à votre espace'}</p>
          </div>

          <div className="rounded-[18px] border border-brand-600/10 bg-white p-8 shadow-[0_1px_2px_rgba(15,18,34,0.04),0_20px_48px_-18px_rgba(76,29,149,0.18)]">
            <form onSubmit={gererSoumission} className="flex flex-col">
              {/* Honeypot anti-bot : masqué visuellement (pas type="hidden",
                  que beaucoup de bots ignorent déjà) et retiré de la
                  navigation clavier/lecteur d'écran. Un humain ne le remplit
                  jamais ; un script générique le fait souvent. */}
              <div
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
              >
                <label htmlFor="siteWeb">Site web</label>
                <input
                  id="siteWeb"
                  name="siteWeb"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={siteWeb}
                  onChange={(e) => setSiteWeb(e.target.value)}
                />
              </div>

              <div className="mb-4.5">
                <label htmlFor="identifiant" className="mb-2 block text-sm font-semibold text-slate-800">
                  Identifiant
                </label>
                <div className="relative flex items-center">
                  <UserIcon size={18} className="absolute left-3.5 text-slate-400" />
                  <input
                    id="identifiant"
                    type="text"
                    placeholder="Votre identifiant"
                    value={identifiant}
                    onChange={(e) => setIdentifiant(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full rounded-[11px] border-[1.5px] border-slate-200 bg-white py-3 pl-[42px] pr-3.5 text-[15px] text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="motDePasse" className="mb-2 block text-sm font-semibold text-slate-800">
                  Mot de passe
                </label>
                <div className="relative flex items-center">
                  <Lock size={18} className="absolute left-3.5 text-slate-400" />
                  <input
                    id="motDePasse"
                    type="password"
                    placeholder="********"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-[11px] border-[1.5px] border-slate-200 bg-white py-3 pl-[42px] pr-3.5 text-[15px] text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`mb-4 flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
                    succes ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {succes ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {message}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                loading={chargement}
                className="w-full !h-auto rounded-[11px] border-none bg-gradient-to-br from-[#8b3ff0] to-brand-600 py-3.5 text-base font-bold text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.55)] hover:from-brand-600 hover:to-brand-700"
              >
                {chargement ? 'Connexion...' : 'Se connecter'}
              </Button>

              <a href="/mdp-oublie" className="mt-4.5 text-center text-[14.5px] text-slate-500 hover:text-slate-700">
                Mot de passe oublié ?
              </a>
            </form>
          </div>

          <div className="text-center mt-6">
            <a href={lienAutreEspace.href} className="border-b border-slate-900/20 pb-px text-[14.5px] font-medium text-slate-800 hover:text-brand-700">
              {lienAutreEspace.label}
            </a>
          </div>

          <nav className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
            <a href="/mentions-legales" className="hover:text-slate-600 hover:underline">Mentions légales</a>
            <span aria-hidden="true">·</span>
            <a href="/politique-confidentialite" className="hover:text-slate-600 hover:underline">Confidentialité</a>
            <span aria-hidden="true">·</span>
            <a href="/politique-cookies" className="hover:text-slate-600 hover:underline">Cookies</a>
            <span aria-hidden="true">·</span>
            <a href="/cgu" className="hover:text-slate-600 hover:underline">CGU</a>
          </nav>

          <p className="text-center text-[12.5px] text-slate-400 mt-3">
            © {new Date().getFullYear()} LyovaTech — Système de ticketing interne
          </p>
        </div>
      </div>

      <BanniereCookies />
    </div>
  );
}
