'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Building2, Users, Settings, ClipboardList } from 'lucide-react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';

interface SwitchToggleProps {
  checked: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

// Switch stylé (corporate, sobre)
function SwitchToggle({ checked, onChange }: SwitchToggleProps) {
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

// Effet tilt 3D léger, conservé tel quel comme comportement optionnel (activable/désactivable
// via le réglage "Animation 3D"), mais habillé avec le style de carte corporate.
interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  active?: boolean;
}

function Card3D({ children, className = '', style = {}, active = true, ...props }: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  function handleMouseMove(e: { clientX: number; clientY: number; }) {
    if (!active) return;
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 40;
    const rotateY = (centerX - x) / 40;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }
  function handleMouseLeave() {
    if (!active) return;
    const card = ref.current;
    if (!card) return;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  }
  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: 'transform 0.2s ease', ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
}

export default function ConfigurationPage() {
  // Initialisation depuis localStorage
  const [animation3DActive, setAnimation3DActive] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem('animation3DActive');
    setAnimation3DActive(saved === null ? true : saved === 'true');
  }, []);

  // Sauvegarde dans localStorage à chaque changement
  useEffect(() => {
    if (animation3DActive === undefined) return;
    localStorage.setItem('animation3DActive', animation3DActive ? 'true' : 'false');
    window.dispatchEvent(new Event('animation3DActiveChanged'));
  }, [animation3DActive]);

  // Navigation widgets
  const goTo = (url: string) => window.location.href = url;

  const actions = [
    { label: 'Ajouter entreprise', desc: 'Nouvelle entreprise cliente', icon: <Building2 size={24} />, onClick: () => goTo('/directeur/administration') },
    { label: 'Gestion utilisateurs', desc: 'Gérer les comptes utilisateurs', icon: <Users size={24} />, onClick: () => goTo('/directeur/utilisateur') },
    { label: 'Configuration', desc: 'Paramètres système', icon: <Settings size={24} />, onClick: undefined },
    { label: 'Centre rapports', desc: 'Rapports et exports', icon: <ClipboardList size={24} />, onClick: () => goTo('/directeur/statistiques') },
  ];

  if (animation3DActive === undefined) return null; // ou un loader

  return (
    <DashboardLayout role="directeur">
      <PageHeader title="Configuration" description="Accès rapide aux outils d'administration et réglages système." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {actions.map((a) => (
          <Card3D key={a.label} active={animation3DActive}>
            <Card
              className={`h-full ${a.onClick ? 'cursor-pointer hover:border-brand-300' : ''}`}
              onClick={a.onClick}
            >
              <CardBody className="flex flex-col items-center text-center gap-2">
                <span className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">{a.icon}</span>
                <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                <p className="text-xs text-slate-500">{a.desc}</p>
              </CardBody>
            </Card>
          </Card3D>
        ))}
      </div>

      <Card className="max-w-2xl">
        <CardBody>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Paramètres</h2>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Animation 3D sur les cartes</p>
              <p className="text-xs text-slate-500 mt-0.5">Active ou désactive l&apos;effet de survol 3D sur les cartes ci-dessus.</p>
            </div>
            <SwitchToggle checked={animation3DActive} onChange={() => setAnimation3DActive(a => !a)} />
          </div>
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}
