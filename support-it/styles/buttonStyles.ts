import type { CSSProperties } from 'react';

// Styles de boutons partagés (technicien/directeur/admin) pour garantir une taille
// et un centrage de texte homogènes sur tous les tableaux de bord.

export const BTN_BASE: CSSProperties = {
  height: 46,
  padding: '0 24px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontSize: 15,
  fontWeight: 600,
  borderRadius: 12,
  cursor: 'pointer',
  textAlign: 'center',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
  border: 'none',
};

// Variante compacte utilisée dans les listes (ex: cartes de tickets, filtres)
export const BTN_BASE_SM: CSSProperties = {
  ...BTN_BASE,
  height: 38,
  padding: '0 18px',
  fontSize: 14,
  borderRadius: 10,
};

export const BTN_PRIMARY: CSSProperties = {
  ...BTN_BASE,
  background: 'linear-gradient(135deg, #4c6ef5 0%, #7c3aed 100%)',
  color: '#fff',
};

export const BTN_PRIMARY_SM: CSSProperties = {
  ...BTN_BASE_SM,
  background: 'linear-gradient(135deg, #4c6ef5 0%, #7c3aed 100%)',
  color: '#fff',
};

export const BTN_SECONDARY: CSSProperties = {
  ...BTN_BASE,
  background: '#f8f9fa',
  color: '#6c757d',
  border: '1px solid #e9ecef',
};

export const BTN_SECONDARY_SM: CSSProperties = {
  ...BTN_BASE_SM,
  background: '#f8f9fa',
  color: '#6c757d',
  border: '1px solid #e9ecef',
};

export const BTN_GHOST_SM: CSSProperties = {
  ...BTN_BASE_SM,
  background: '#fff',
  color: '#666',
  border: '2px solid #e0e0e0',
};

export const BTN_DANGER: CSSProperties = {
  ...BTN_BASE,
  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  color: '#fff',
};

export const BTN_DANGER_SM: CSSProperties = {
  ...BTN_BASE_SM,
  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  color: '#fff',
};

export const BTN_SUCCESS: CSSProperties = {
  ...BTN_BASE,
  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  color: '#fff',
};

export const BTN_SUCCESS_SM: CSSProperties = {
  ...BTN_BASE_SM,
  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  color: '#fff',
};

// Boutons "pill" (filtres de priorité/statut)
export const BTN_PILL: CSSProperties = {
  ...BTN_BASE_SM,
  borderRadius: 25,
  background: '#fff',
  color: '#333',
  border: '2px solid #f0f0f0',
};

export const BTN_PILL_ACTIVE: CSSProperties = {
  ...BTN_PILL,
  background: 'linear-gradient(135deg, #4c6ef5 0%, #7c3aed 100%)',
  color: '#fff',
  border: '2px solid transparent',
  boxShadow: '0 10px 30px rgba(76,110,245,0.3)',
};

export const BTN_DISABLED: CSSProperties = {
  opacity: 0.6,
  cursor: 'not-allowed',
};
