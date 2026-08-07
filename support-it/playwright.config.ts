import { defineConfig, devices } from '@playwright/test';

// Couverture stratégique volontairement réduite (2 parcours critiques :
// connexion, création de ticket) plutôt qu'une couverture exhaustive — voir
// backend/tests/ pour l'équivalent côté PHP et le README à la racine pour
// le raisonnement complet. Tourne contre l'environnement local (MAMP +
// `npm run dev`), jamais contre la production.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
