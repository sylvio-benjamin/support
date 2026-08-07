'use client';

import FormulaireConnexion from '../_components/FormulaireConnexion';

export default function ConnexionEntreprise() {
  return (
    <FormulaireConnexion
      typeCompte="utilisateur"
      titre="Espace Utilisateur"
      sousTitre="Espace employé et administrateur référent"
      lienAutreEspace={{ href: '/connexion/lyovatech', label: 'Vous êtes technicien LyovaTech ? Connectez-vous ici' }}
    />
  );
}
