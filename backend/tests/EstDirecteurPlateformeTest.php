<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../config/session.php';

/**
 * estDirecteurPlateforme() distingue un directeur INTERNE (portée sur toute
 * la plateforme) d'un directeur "client" (portée limitée à sa seule
 * entreprise) — la même chaîne de rôle 'directeur' désigne les deux, donc
 * cette fonction est le seul rempart contre une élévation de privilège
 * accidentelle. Testée ici en isolation (sans session HTTP réelle, juste un
 * tableau $_SESSION['user'] construit à la main) parce qu'une régression
 * silencieuse ici aurait un impact de sécurité direct — voir aussi
 * cybersecurity/rapports/scope_directeur.md, qui teste le même invariant
 * en boîte noire par-dessus HTTP.
 */
final class EstDirecteurPlateformeTest extends TestCase
{
    protected function tearDown(): void
    {
        $_SESSION = [];
    }

    public function testFauxSiPasConnecte(): void
    {
        $_SESSION = [];
        $this->assertFalse(estDirecteurPlateforme());
    }

    public function testFauxSiRoleNestPasDirecteur(): void
    {
        $_SESSION['user'] = ['role' => 'technicien', 'idTechnicien' => 12];
        $this->assertFalse(estDirecteurPlateforme());
    }

    public function testVraiPourUnDirecteurInterneAvecIdTechnicien(): void
    {
        $_SESSION['user'] = ['role' => 'directeur', 'idTechnicien' => 12];
        $this->assertTrue(estDirecteurPlateforme());
    }

    public function testVraiPourUnDirecteurInterneAvecIdDirecteur(): void
    {
        $_SESSION['user'] = ['role' => 'directeur', 'idDirecteur' => 3];
        $this->assertTrue(estDirecteurPlateforme());
    }

    /**
     * Le cas réel qui a motivé cette fonction : un directeur "client" a
     * role='directeur' MAIS aucun idTechnicien/idDirecteur — seulement
     * idUtilisateur + idEntreprise (ligne de la table `utilisateur`). Un
     * champ manquant ou une session mal reconstruite ne doit JAMAIS, à lui
     * seul, élever ce compte au rang de directeur plateforme.
     */
    public function testFauxPourUnDirecteurClientMemeAvecMemeRole(): void
    {
        $_SESSION['user'] = [
            'role' => 'directeur',
            'idUtilisateur' => 42,
            'idEntreprise' => 26,
        ];
        $this->assertFalse(estDirecteurPlateforme());
    }

    public function testFauxSiUserNestPasUnTableau(): void
    {
        $_SESSION['user'] = 'directeur';
        $this->assertFalse(estDirecteurPlateforme());
    }
}
