import { LegalPageLayout, Section } from '../../components/LegalPageLayout';

export const metadata = { title: 'Politique des cookies — LyovaTech Support' };

export default function PolitiqueCookiesPage() {
  return (
    <LegalPageLayout titre="Politique des cookies" sousTitre="Dernière mise à jour : 30 juillet 2026">
      <Section titre="Ce que nous utilisons">
        <p>
          LyovaTech Support n&apos;utilise que des cookies et technologies de stockage <strong>strictement
          nécessaires</strong> au fonctionnement du service. Aucun cookie publicitaire, de mesure d&apos;audience
          tierce ou de traçage inter-sites n&apos;est déposé.
        </p>
      </Section>

      <Section titre="Cookie de session (PHPSESSID)">
        <p>
          Ce cookie technique identifie votre session une fois connecté. Il est indispensable au fonctionnement de
          l&apos;application : sans lui, il est impossible de rester authentifié entre deux pages.
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Finalité :</strong> maintenir votre session authentifiée.</li>
          <li><strong>Durée :</strong> le temps de la session (expire automatiquement après 8 heures d&apos;inactivité, ou à la déconnexion).</li>
          <li><strong>Attributs de sécurité :</strong> HttpOnly (inaccessible en JavaScript), SameSite=Lax, transmis en HTTPS uniquement en production.</li>
          <li><strong>Exemption de consentement :</strong> ce cookie étant strictement nécessaire à la fourniture du service demandé, il ne nécessite pas de consentement préalable (article 82 de la loi Informatique et Libertés).</li>
        </ul>
      </Section>

      <Section titre="Stockage local du navigateur (localStorage)">
        <p>
          En complément du cookie de session, l&apos;application utilise le stockage local de votre navigateur (non
          transmis au serveur) pour mémoriser certaines préférences d&apos;affichage et éviter des allers-retours
          inutiles :
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>vos informations de profil affichées dans l&apos;interface (nom, rôle) ;</li>
          <li>vos préférences d&apos;affichage (mode compact).</li>
        </ul>
        <p>Ces données restent sur votre appareil et sont supprimées à la déconnexion ou en vidant les données de navigation.</p>
      </Section>

      <Section titre="Gérer les cookies">
        <p>
          Le cookie de session étant indispensable à la connexion, le désactiver depuis les réglages de votre
          navigateur vous empêchera d&apos;utiliser l&apos;application. Vous pouvez à tout moment supprimer les
          cookies et données de site déjà enregistrés depuis les paramètres de confidentialité de votre navigateur.
        </p>
      </Section>

      <Section titre="Contact">
        <p>Pour toute question sur cette politique : contact@lyovatech.fr.</p>
      </Section>
    </LegalPageLayout>
  );
}
