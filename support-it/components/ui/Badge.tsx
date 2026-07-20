import React from 'react';
import { STATUT_COLOR, PRIORITE_COLOR } from '../../styles/tokens';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

export function StatutBadge({ statut }: { statut: string }) {
  const info = STATUT_COLOR[statut] || STATUT_COLOR.en_attente;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: info.bg, color: info.fg }}
    >
      {info.label}
    </span>
  );
}

export function PrioriteBadge({ priorite }: { priorite: string }) {
  const info = PRIORITE_COLOR[priorite?.toLowerCase()] || PRIORITE_COLOR.normale;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: info.bg, color: info.fg }}
    >
      {info.label}
    </span>
  );
}

export default Badge;
