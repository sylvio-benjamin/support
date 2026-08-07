// Listes partagées pour le formulaire entreprise (création + édition), afin
// de remplacer les champs texte libre par des menus déroulants.

export const CATEGORIES_ENTREPRISE = [
  'Technologie / Informatique',
  'Finance / Assurance',
  'Santé / Médical',
  'Industrie / Production',
  'Commerce / Distribution',
  'BTP / Immobilier',
  'Transport / Logistique',
  'Éducation / Formation',
  'Restauration / Hôtellerie',
  'Services aux entreprises',
  'Administration publique',
  'Association / ONG',
  'Autre',
] as const;

// France en tête (public cible principal), puis ordre alphabétique.
export const PAYS = [
  'France',
  'Allemagne',
  'Belgique',
  'Canada',
  'Espagne',
  'Italie',
  'Luxembourg',
  'Maroc',
  'Pays-Bas',
  'Portugal',
  'Royaume-Uni',
  'Suisse',
  'Tunisie',
  'Autre',
] as const;
