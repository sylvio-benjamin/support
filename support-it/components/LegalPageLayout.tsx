import React from 'react';

export function LegalPageLayout({
  titre,
  sousTitre,
  children,
}: {
  titre: string;
  sousTitre?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/images/logo_lyo-removebg-preview.png" alt="LyovaTech" className="w-7 h-7 object-contain" />
            <span className="font-semibold text-slate-900">LyovaTech</span>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{titre}</h1>
        {sousTitre && <p className="mt-2 text-sm text-slate-500">{sousTitre}</p>}

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-slate-700">
          {children}
        </div>

        <PiedDePageLegal />
      </main>
    </div>
  );
}

export function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-base font-semibold text-slate-900">{titre}</h2>
      {children}
    </section>
  );
}

export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
      {children}
    </span>
  );
}

function PiedDePageLegal() {
  const liens = [
    { href: '/mentions-legales', label: 'Mentions légales' },
    { href: '/politique-confidentialite', label: 'Politique de confidentialité' },
    { href: '/politique-cookies', label: 'Politique des cookies' },
    { href: '/cgu', label: "Conditions générales d'utilisation" },
  ];

  return (
    <div className="mt-14 pt-6 border-t border-slate-200 flex flex-col gap-3">
      <nav className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {liens.map((l) => (
          <a key={l.href} href={l.href} className="text-brand-600 hover:text-brand-700 hover:underline">
            {l.label}
          </a>
        ))}
      </nav>
      <p className="text-xs text-slate-400">© {new Date().getFullYear()} LyovaTech — Système de ticketing interne</p>
    </div>
  );
}
