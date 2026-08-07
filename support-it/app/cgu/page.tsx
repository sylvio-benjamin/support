import { LegalPageLayout, Section } from '../../components/LegalPageLayout';

export const metadata = { title: "Conditions générales d'utilisation — LyovaTech Support" };

export default function CguPage() {
  return (
    <LegalPageLayout titre="Conditions générales d'utilisation" sousTitre="Dernière mise à jour : 30 juillet 2026">
      <Section titre="1. Objet">
        <p>
          Les présentes conditions générales d&apos;utilisation (« CGU ») régissent l&apos;accès et l&apos;utilisation
          de l&apos;application « Support LyovaTech », plateforme de gestion de tickets d&apos;assistance technique
          éditée par LyovaTech (LYOVATECH), SAS au capital de 7 000 €, immatriculée sous le numéro SIREN
          942 395 708 (RCS Sarreguemines), dont le siège social est situé 16 Rue Sainte-Croix, 57600 Forbach.
          Toute utilisation du service implique l&apos;acceptation pleine et entière des présentes CGU.
        </p>
      </Section>

      <Section titre="2. Accès au service">
        <p>
          L&apos;accès est réservé aux personnes disposant d&apos;un compte valide, créé soit directement par
          LyovaTech (techniciens, référents, direction), soit par un administrateur référent d&apos;une entreprise
          cliente pour ses employés. L&apos;application n&apos;est pas ouverte au public et ne permet pas
          d&apos;auto-inscription.
        </p>
      </Section>

      <Section titre="3. Comptes utilisateurs">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Chaque compte est nominatif et ne doit pas être partagé entre plusieurs personnes.</li>
          <li>Vous êtes responsable de la confidentialité de votre identifiant et mot de passe, et de toute activité effectuée depuis votre compte.</li>
          <li>Vous vous engagez à informer LyovaTech ou votre administrateur référent en cas de suspicion d&apos;utilisation non autorisée de votre compte.</li>
          <li>En cas de départ d&apos;un collaborateur, il appartient à l&apos;entreprise cliente de demander la désactivation du compte correspondant.</li>
        </ul>
      </Section>

      <Section titre="4. Utilisation du service">
        <p>Vous vous engagez à utiliser la plateforme conformément à sa finalité (création et suivi de tickets d&apos;assistance) et à ne pas :</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>tenter de contourner les mécanismes d&apos;authentification ou de sécurité ;</li>
          <li>soumettre des tickets ou messages à caractère abusif, frauduleux ou sans rapport avec une demande d&apos;assistance réelle ;</li>
          <li>tenter d&apos;accéder à des données ou fonctionnalités non autorisées pour votre rôle ;</li>
          <li>perturber le fonctionnement normal du service (surcharge, scripts automatisés, etc.).</li>
        </ul>
        <p>
          Un dispositif de limitation des tentatives de connexion est en place et peut bloquer temporairement
          l&apos;accès en cas de tentatives répétées et suspectes.
        </p>
      </Section>

      <Section titre="5. Disponibilité et support">
        <p>
          LyovaTech met en œuvre les moyens raisonnables pour assurer la disponibilité et le bon fonctionnement de
          l&apos;application, sans garantie de disponibilité continue. Des interruptions peuvent survenir pour des
          opérations de maintenance, avec ou sans préavis selon leur nature.
        </p>
      </Section>

      <Section titre="6. Propriété intellectuelle">
        <p>
          La structure, le code, les interfaces graphiques et la marque LyovaTech sont protégés par le droit de la
          propriété intellectuelle. Aucune disposition des présentes CGU ne vaut cession de droits à
          l&apos;utilisateur. Le contenu que vous soumettez (tickets, messages, pièces jointes) reste votre propriété
          ; vous accordez à LyovaTech le droit de le traiter dans la seule mesure nécessaire à la fourniture du
          service de support.
        </p>
      </Section>

      <Section titre="7. Responsabilité">
        <p>
          LyovaTech ne saurait être tenue responsable des dommages indirects résultant de l&apos;utilisation ou de
          l&apos;impossibilité d&apos;utiliser le service. Chaque utilisateur reste responsable de l&apos;exactitude
          des informations qu&apos;il transmet via la plateforme.
        </p>
      </Section>

      <Section titre="8. Résiliation">
        <p>
          L&apos;accès d&apos;un compte peut être suspendu ou clôturé par LyovaTech en cas de manquement aux
          présentes CGU, à la demande de l&apos;entreprise cliente concernée, ou à la fin de la relation contractuelle
          entre LyovaTech et cette entreprise.
        </p>
      </Section>

      <Section titre="9. Modification des CGU">
        <p>
          LyovaTech peut faire évoluer les présentes CGU pour tenir compte de l&apos;évolution du service ou de la
          réglementation. La date de dernière mise à jour figure en haut de cette page.
        </p>
      </Section>

      <Section titre="10. Droit applicable">
        <p>
          Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation ou leur
          exécution relève de la compétence du tribunal de commerce de Sarreguemines, sauf disposition légale
          impérative contraire.
        </p>
      </Section>

      <Section titre="11. Contact">
        <p>Pour toute question relative aux présentes CGU : contact@lyovatech.fr.</p>
      </Section>
    </LegalPageLayout>
  );
}
