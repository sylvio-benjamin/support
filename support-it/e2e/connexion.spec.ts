import { test, expect } from '@playwright/test';

// Compte de test local (MAMP) — voir README.md racine, section "Comptes de
// test". Mot de passe fixé pour les besoins du test (voir note dans le
// README sur ce compte précis).
const IDENTIFIANT = 'NilsLyo';
const MOT_DE_PASSE = 'testpass123';

test.describe('Connexion', () => {
  test('connexion réussie redirige vers le tableau de bord', async ({ page }) => {
    await page.goto('/connexion/lyovatech');

    await page.getByLabel('Identifiant').fill(IDENTIFIANT);
    await page.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).not.toHaveURL(/\/connexion/);
    // Le compte de test a le rôle directeur : atterrit dans /directeur/*.
    await expect(page).toHaveURL(/\/directeur/);
  });

  test('mauvais mot de passe reste sur la page de connexion avec un message', async ({ page }) => {
    await page.goto('/connexion/lyovatech');

    await page.getByLabel('Identifiant').fill(IDENTIFIANT);
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/connexion/);
    await expect(page.getByText(/incorrect/i)).toBeVisible();
  });
});
