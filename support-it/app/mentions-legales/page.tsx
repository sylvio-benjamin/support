import { LegalPageLayout, Section } from '../../components/LegalPageLayout';

export const metadata = { title: 'Mentions légales — LyovaTech Support' };

export default function MentionsLegalesPage() {
  return (
    <LegalPageLayout titre="Mentions légales" sousTitre="Dernière mise à jour : 30 juillet 2026">
      <Section titre="Éditeur du site">
        <p>
          Le présent site et l&apos;application « Support LyovaTech » sont édités par LyovaTech (dénomination
          sociale : LYOVATECH), Société par Actions Simplifiée (SAS) au capital de 7 000 €, immatriculée au
          Registre du Commerce et des Sociétés de Sarreguemines sous le numéro SIREN 942 395 708 (SIRET du siège :
          942 395 708 00012), dont le siège social est situé 16 Rue Sainte-Croix, 57600 Forbach, France.
        </p>
        <p>Numéro de TVA intracommunautaire : FR13 942395708.</p>
        <p>Code APE/NAF : 6201Z – Programmation informatique.</p>
        <p>Contact : contact@lyovatech.fr — 03 10 45 44 65</p>
      </Section>

      <Section titre="Directeur de la publication">
        <p>Nils Fradet, Président de LyovaTech.</p>
      </Section>

      <Section titre="Hébergement">
        <p>
          L&apos;application est hébergée par LyovaTech elle-même, sur sa propre infrastructure serveur. Pour toute
          question relative à l&apos;hébergement, contactez contact@lyovatech.fr.
        </p>
      </Section>

      <Section titre="Objet du site">
        <p>
          « Support LyovaTech » est une application interne de gestion de tickets d&apos;assistance technique, réservée
          aux techniciens, référents et membres de la direction de LyovaTech ainsi qu&apos;aux employés et
          administrateurs référents des entreprises clientes accompagnées par LyovaTech. L&apos;accès est protégé par
          authentification et n&apos;est pas ouvert au public.
        </p>
      </Section>

      <Section titre="Activité">
        <p>
          Conception, réalisation et exploitation de produits informatiques et électroniques, prestations de
          services et de conseil, développement de sites web, infrastructures informatiques, téléphonie IP,
          serveurs, hébergement web, cybersécurité, commercialisation de logiciels et de matériel informatique.
        </p>
      </Section>

      <Section titre="Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments techniques, graphiques et logiciels de l&apos;application (structure,
          interface, code, logo, textes) est la propriété exclusive de LyovaTech, sauf mentions contraires, et est
          protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation ou exploitation,
          totale ou partielle, sans autorisation préalable est interdite.
        </p>
      </Section>

      <Section titre="Signaler un contenu ou une anomalie">
        <p>
          Pour toute question relative à ces mentions légales, ou pour signaler un contenu ou un incident de
          sécurité, contactez contact@lyovatech.fr.
        </p>
      </Section>
    </LegalPageLayout>
  );
}
