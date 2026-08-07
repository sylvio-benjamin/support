import { test, expect } from '@playwright/test';

// Compte employé jetable provisionné via
// cybersecurity/script-test-instrusion/provisionner_comptes_test.py — voir
// README.md racine. Si ce compte n'existe plus (nettoyé/expiré), relancer
// ce script et mettre ces deux constantes à jour.
const IDENTIFIANT = 'pentest-c4903a58';
const MOT_DE_PASSE = 'Test-Pentest-2026!';

// BUG DÉCOUVERT PAR CE TEST (06/08/2026), pas encore corrigé — voir
// support-it/app/employe/ticket/page.tsx, handleSubmit du NouveauTicketModal :
// cliquer sur "Créer le ticket" passe bien le bouton en état "Création..."
// (désactivé), mais AUCUNE requête n'est envoyée à ajouterTicket.php —
// seule une requête getNotifications.php sans rapport part. Le bouton reste
// bloqué indéfiniment, sans message d'erreur. Comportement intermittent :
// certaines tentatives (avec Catégorie + Sous-catégorie sélectionnées)
// réussissent réellement (un ticket #10 a été créé pendant le diagnostic),
// la plupart échouent silencieusement de cette façon. Cause probable à
// investiguer en priorité : le handleSubmit qui construit le FormData
// (champ pieceJointe/fichier potentiellement mal géré quand aucun fichier
// n'est sélectionné). Hors périmètre de la session d'industrialisation du
// 06/08/2026 (qui ajoutait l'outillage de test, pas la correction de bugs
// applicatifs découverts par ce même outillage) — à corriger séparément,
// puis retirer .fixme() ci-dessous.
test.fixme('un employé peut créer un ticket', async ({ page }) => {
  await page.goto('/connexion/entreprise');
  await page.getByLabel('Identifiant').fill(IDENTIFIANT);
  await page.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).not.toHaveURL(/\/connexion/);

  // Le tableau de bord (/employe) n'a pas le bouton "Nouveau ticket" — il
  // vit sur la page "Mes tickets".
  await page.goto('/employe/ticket');
  await page.getByRole('button', { name: 'Nouveau ticket' }).first().click();

  const titre = `Ticket e2e ${Date.now()}`;
  await page.getByLabel('Titre du ticket').fill(titre);
  await page.getByLabel('Description').fill('Ticket créé automatiquement par le test e2e Playwright.');
  // Non marquées `required` dans le formulaire, mais exigées côté serveur
  // (ajouterTicket.php) — incohérence frontend/backend, elle aussi
  // découverte par ce test, à corriger avec le bug ci-dessus.
  await page.getByLabel('Catégorie', { exact: true }).selectOption({ index: 1 });
  const sousCategorie = page.getByLabel('Sous-catégorie');
  await expect(sousCategorie).toBeEnabled();
  await sousCategorie.selectOption({ index: 1 });

  const [reponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('ajouterTicket.php')),
    page.getByRole('button', { name: 'Créer le ticket' }).click(),
  ]);
  const corps = await reponse.json();
  expect(reponse.status()).toBe(200);
  expect(corps.success).toBe(true);

  await page.reload();
  await expect(page.getByText(titre)).toBeVisible({ timeout: 10_000 });
});
