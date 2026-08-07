import { LegalPageLayout, Section, Placeholder } from '../../components/LegalPageLayout';

export const metadata = { title: 'Politique de confidentialité — LyovaTech Support' };

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPageLayout titre="Politique de confidentialité" sousTitre="Dernière mise à jour : 30 juillet 2026">
      <Section titre="1. Responsable de traitement">
        <p>
          Pour les comptes internes LyovaTech (techniciens, référents, direction), le responsable de traitement est
          LyovaTech (LYOVATECH), SAS immatriculée sous le numéro SIREN 942 395 708 (RCS Sarreguemines), dont le
          siège social est situé 16 Rue Sainte-Croix, 57600 Forbach, France. Contact : contact@lyovatech.fr.
        </p>
        <p>
          Pour les comptes des entreprises clientes (employés, administrateurs référents), l&apos;entreprise cliente
          reste responsable de traitement des données de ses propres salariés ; LyovaTech agit en tant que
          sous-traitant au sens du RGPD pour l&apos;hébergement et le traitement technique de ces données dans le
          cadre du contrat de support conclu avec l&apos;entreprise cliente.
        </p>
      </Section>

      <Section titre="2. Données collectées">
        <p>Dans le cadre du fonctionnement de la plateforme, nous collectons :</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Données de compte : nom, prénom, email, téléphone, date de naissance, identifiant et mot de passe (stocké sous forme hachée, jamais en clair).</li>
          <li>Données liées aux tickets : titre, description, catégorie, priorité, pièces jointes, messages échangés avec le technicien assigné.</li>
          <li>Photo de profil (facultative).</li>
          <li>Données techniques de sécurité : adresse IP et horodatage des tentatives de connexion, à des fins de détection et de limitation des tentatives d&apos;intrusion (protection anti force brute).</li>
          <li>Cookie de session strictement nécessaire à l&apos;authentification (voir notre <a href="/politique-cookies" className="text-brand-600 hover:underline">politique des cookies</a>).</li>
        </ul>
      </Section>

      <Section titre="3. Finalités du traitement">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Créer et gérer votre compte utilisateur et vous authentifier de façon sécurisée.</li>
          <li>Assurer le suivi et la résolution des tickets d&apos;assistance technique.</li>
          <li>Vous notifier par email des événements concernant vos tickets (création, assignation, résolution).</li>
          <li>Assurer la sécurité de la plateforme (limitation des tentatives de connexion, journalisation des accès).</li>
          <li>Produire des statistiques internes d&apos;activité et de performance (volumes de tickets, délais de résolution).</li>
        </ul>
        <p>Aucune donnée n&apos;est utilisée à des fins commerciales, publicitaires, ou revendue à des tiers.</p>
      </Section>

      <Section titre="4. Base légale">
        <p>
          Les traitements reposent sur l&apos;exécution du contrat de support conclu entre LyovaTech et votre
          entreprise (ou votre relation de travail avec LyovaTech), ainsi que sur l&apos;intérêt légitime de LyovaTech
          à sécuriser sa plateforme (journalisation des tentatives de connexion).
        </p>
      </Section>

      <Section titre="5. Destinataires des données">
        <p>
          Vos données sont accessibles aux techniciens et à la direction LyovaTech en charge du traitement de votre
          ticket, ainsi qu&apos;aux administrateurs référents de votre propre entreprise pour les tickets de leurs
          collaborateurs. Aucune donnée n&apos;est transmise à des tiers en dehors des prestataires strictement
          nécessaires au fonctionnement du service (hébergement, envoi d&apos;emails transactionnels).
        </p>
      </Section>

      <Section titre="6. Durée de conservation">
        <p>
          Les données de compte sont conservées pendant toute la durée de la relation contractuelle avec votre
          entreprise, puis archivées ou supprimées selon les délais suivants : <Placeholder>[durée de conservation après clôture du compte, ex. 3 ans]</Placeholder>.
          Les tickets résolus sont archivés à des fins de traçabilité et de statistiques. Les journaux de tentatives
          de connexion sont conservés 15 minutes glissantes à des fins de limitation de débit, puis supprimés
          automatiquement.
        </p>
      </Section>

      <Section titre="7. Sécurité">
        <p>
          Les mots de passe sont hachés (bcrypt) et ne sont jamais stockés ni transmis en clair. Les sessions sont
          protégées par cookie sécurisé (HttpOnly, SameSite). Les tentatives de connexion sont limitées par adresse IP
          et par identifiant pour prévenir les attaques par force brute. Les accès aux sections de l&apos;application
          sont contrôlés côté serveur selon votre rôle.
        </p>
      </Section>

      <Section titre="8. Vos droits">
        <p>
          Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et
          Libertés, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, de
          portabilité et d&apos;opposition sur vos données personnelles. Aucun délégué à la protection des données
          (DPO) n&apos;est désigné à ce jour ; toute demande relative à vos données doit être adressée à
          contact@lyovatech.fr en précisant votre demande. Vous disposez également du droit d&apos;introduire une
          réclamation auprès de la Commission Nationale de l&apos;Informatique et des Libertés (CNIL) — www.cnil.fr.
        </p>
      </Section>

      <Section titre="9. Contact">
        <p>Pour toute question relative à cette politique de confidentialité : contact@lyovatech.fr.</p>
      </Section>
    </LegalPageLayout>
  );
}
