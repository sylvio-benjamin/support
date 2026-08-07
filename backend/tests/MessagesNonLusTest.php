<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../modele/lib/messagesNonLus.php';

/**
 * Couvre le bug corrigé cette session : la sous-requête qui détermine la
 * dernière lecture d'un ticket devait impérativement trier par
 * `dateLecture DESC` avant son `LIMIT 1`, sans quoi une ligne en doublon
 * (voir la migration 0007, clé unique cassée par des colonnes nullables)
 * pouvait faire remonter une ancienne lecture au lieu de la plus récente —
 * le badge "messages non lus" restait alors bloqué indéfiniment. Ce test
 * ne rejoue pas le bug de doublon lui-même (couvert par la migration SQL),
 * il garantit que la requête générée reste correcte si quelqu'un la
 * modifie plus tard sans connaître cet historique.
 */
final class MessagesNonLusTest extends TestCase
{
    public function testAucunIdentifiantRetourneComptageSimple(): void
    {
        $sql = getMessagesNonLusQuery(null, 'utilisateur');

        $this->assertStringContainsString('COUNT(*) FROM conversation c', $sql);
        $this->assertStringNotContainsString('messagesLus', $sql);
    }

    public function testBrancheUtilisateurTrieParDateLectureDescendante(): void
    {
        $sql = getMessagesNonLusQuery(81, 'utilisateur');

        $this->assertStringContainsString('ml.idUtilisateur = 81', $sql);
        $this->assertStringContainsString("ml.typeUtilisateur = 'utilisateur'", $sql);
        $this->assertStringContainsString('ORDER BY ml.dateLecture DESC', $sql);
        $this->assertStringContainsString('LIMIT 1', $sql);
        // La branche utilisateur ne doit jamais filtrer sur idTechnicien.
        $this->assertStringNotContainsString('ml.idTechnicien = 81', $sql);
    }

    /** @dataProvider typesUtilisateurEquivalents */
    public function testAdminEtReferentPartagentLaBrancheUtilisateur(string $type): void
    {
        $sql = getMessagesNonLusQuery(5, $type);

        $this->assertStringContainsString('ml.idUtilisateur = 5', $sql);
        $this->assertStringContainsString("ml.typeUtilisateur = '$type'", $sql);
    }

    public static function typesUtilisateurEquivalents(): array
    {
        return [['utilisateur'], ['admin'], ['referent']];
    }

    public function testBrancheTechnicienFiltreSurIdTechnicienEtTrieAussi(): void
    {
        $sql = getMessagesNonLusQuery(12, 'directeur');

        $this->assertStringContainsString('ml.idTechnicien = 12', $sql);
        $this->assertStringContainsString("ml.typeUtilisateur = 'directeur'", $sql);
        $this->assertStringContainsString('ORDER BY ml.dateLecture DESC', $sql);
        // La branche technicien/directeur ne doit jamais filtrer sur idUtilisateur.
        $this->assertStringNotContainsString('ml.idUtilisateur = 12', $sql);
    }
}
