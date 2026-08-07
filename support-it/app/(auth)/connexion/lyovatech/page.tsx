'use client';

import FormulaireConnexion from '../_components/FormulaireConnexion';

export default function ConnexionLyovaTech() {
  return (
    <FormulaireConnexion
      typeCompte="technicien"
      titre="Espace LyovaTech"
      sousTitre="Espace technicien, référent et direction"
      lienAutreEspace={{ href: '/connexion/entreprise', label: 'Vous êtes une entreprise cliente ? Connectez-vous ici' }}
    />
  );
}
