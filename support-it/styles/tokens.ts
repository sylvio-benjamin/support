// Jetons de design partagés (miroir des variables CSS de app/globals.css).
// À utiliser pour tout style inline qui ne peut pas passer par une classe
// Tailwind (couleurs dynamiques, canvas de graphiques, etc.).

export const colors = {
  brand: {
    50: '#f6effe', 100: '#eadafc', 200: '#d5b4f8', 300: '#b67cf3', 400: '#9744ee',
    500: '#8e33ed', 600: '#7e17ea', 700: '#6411bb', 800: '#500d96', 900: '#3c0a70',
  },
  neutral: {
    0: '#ffffff', 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a',
  },
  success: { 50: '#ecfdf5', 500: '#10b981', 600: '#059669', 700: '#047857' },
  warning: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
  danger:  { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
  info:    { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
} as const;

export const radius = { sm: 6, md: 8, lg: 12 } as const;

export const shadow = {
  xs: '0 1px 2px rgba(15, 23, 42, 0.05)',
  sm: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
  md: '0 4px 12px rgba(15, 23, 42, 0.08)',
} as const;

// Statuts de ticket -> couleur sémantique (utilisé par Badge / graphiques)
export const STATUT_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  en_attente: { bg: colors.warning[50], fg: colors.warning[700], label: 'En attente' },
  en_cours:   { bg: colors.info[50],    fg: colors.info[700],    label: 'En cours' },
  resolu:     { bg: colors.success[50], fg: colors.success[700], label: 'Résolu' },
  ferme:      { bg: colors.neutral[100], fg: colors.neutral[600], label: 'Fermé' },
};

export const PRIORITE_COLOR: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  basse:   { bg: colors.neutral[100], fg: colors.neutral[600], dot: colors.neutral[400], label: 'Basse' },
  normale: { bg: colors.info[50],     fg: colors.info[700],    dot: colors.info[500],    label: 'Normale' },
  haute:   { bg: colors.warning[50],  fg: colors.warning[700], dot: colors.warning[500], label: 'Haute' },
  urgente: { bg: colors.danger[50],   fg: colors.danger[700],  dot: colors.danger[500],  label: 'Urgente' },
};

// Service concerné (affiché via la catégorie du ticket) -> couleur dédiée,
// une par service, choisie pour rester bien distincte des 9 autres (utilisé
// par ServiceBadge sur la page /affichage). Couleur de repli neutre pour
// toute catégorie qui ne serait pas dans cette liste (ex: nouvelle catégorie
// ajoutée en base depuis).
export const SERVICE_COLOR: Record<string, { bg: string; fg: string }> = {
  'Administration':                   { bg: '#eef2ff', fg: '#4338ca' }, // indigo
  'Comptes et accès':                 { bg: colors.info[50],    fg: colors.info[700] },    // bleu
  'Demande de service':                { bg: '#f0fdfa', fg: '#0f766e' }, // sarcelle
  'Impression et périphériques':      { bg: '#fff7ed', fg: '#c2410c' }, // orange
  'Logiciel':                         { bg: '#f5f3ff', fg: '#6d28d9' }, // violet
  'Matériel(Hardware)':               { bg: colors.warning[50], fg: colors.warning[700] }, // ambre
  'Messagerie et communication':      { bg: '#fdf2f8', fg: '#be185d' }, // rose
  'Réseau et Internet':               { bg: colors.success[50], fg: colors.success[700] }, // émeraude
  'Sécurité informatique':            { bg: colors.danger[50],  fg: colors.danger[700] },  // rouge
  'Stockage fichiers':                { bg: '#f7fee7', fg: '#4d7c0f' }, // citron vert
};

export function colorForService(nom: string): { bg: string; fg: string } {
  return SERVICE_COLOR[nom] || { bg: colors.neutral[100], fg: colors.neutral[600] };
}
