import React from 'react';
import { STATUT_COLOR, PRIORITE_COLOR, colors } from '../../styles/tokens';
import { Tooltip } from './Tooltip';

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

// Puce colorée compacte (alternative à PrioriteBadge pour les listes denses) :
// survolez-la pour voir à quelle priorité correspond la couleur.
export function PrioriteDot({ priorite }: { priorite: string }) {
  const info = PRIORITE_COLOR[priorite?.toLowerCase()] || PRIORITE_COLOR.normale;
  return (
    <Tooltip label={`Priorité : ${info.label}`}>
      <span
        className="inline-block w-2.5 h-2.5 rounded-full shrink-0 cursor-help"
        style={{ background: info.dot }}
      />
    </Tooltip>
  );
}

// Pastille rouge du nombre de messages non lus d'un ticket (n'affiche rien si 0/absent).
export function MessagesNonLusBadge({ nombreMessages }: { nombreMessages?: number | null }) {
  if (!nombreMessages) return null;
  return (
    <span
      title={`${nombreMessages} nouveau${nombreMessages > 1 ? 'x' : ''} message${nombreMessages > 1 ? 's' : ''}`}
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold"
    >
      {nombreMessages > 9 ? '9+' : nombreMessages}
    </span>
  );
}

// Badge pour un libellé ouvert (ex: service/catégorie concerné), coloré selon
// une couleur fournie par l'appelant (voir tokens.colorForService : une
// couleur dédiée par service, choisie pour rester distincte des autres).
export function ServiceBadge({ color, children }: { color?: { bg: string; fg: string }; children: React.ReactNode }) {
  const { bg, fg } = color || { bg: colors.neutral[100], fg: colors.neutral[600] };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

export default Badge;
