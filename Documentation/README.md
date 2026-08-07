# Support LyovaTech

Application SaaS B2B de ticketing IT : les entreprises clientes ouvrent des
tickets de support, des techniciens/directeurs internes à LyovaTech les
traitent (chat temps réel, rendez-vous, notifications, statistiques, écran
d'affichage mural). En production, utilisée par de vraies entreprises
clientes.

## Stack technique

| Composant | Techno |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript strict, Tailwind CSS |
| Backend | PHP 8 procédural (un fichier par action, `backend/modele/`), pas de framework |
| Base de données | MySQL 8 |
| Temps réel | Socket.IO (process Node dédié, `backend/index.js`) |
| Authentification | Session PHP classique (cookie, pas de JWT) |
| Serveur | VPS unique : nginx (reverse proxy) + PHP-FPM + PM2 (Next.js et Socket.IO) |

Rôles applicatifs : **employé**, **admin/référent** (entreprise cliente),
**technicien**, **directeur** (interne plateforme *ou* client d'une
entreprise — deux portées différentes, voir `estDirecteurPlateforme()` dans
`backend/config/session.php`), **affichage** (écran mural public, sans
authentification, par lien à token).

## Démarrage en local

Prérequis : MAMP (ou équivalent Apache+PHP+MySQL en local), Node.js 20+.

```bash
# Backend : servi par MAMP depuis le dossier backend/ (pas de serveur à lancer à la main)
# Vérifier que backend/composer.phar install a été exécuté au moins une fois :
cd backend && php composer.phar install

# Frontend
cd support-it
npm install
cp .env.example .env   # puis renseigner les valeurs (voir ci-dessous)
npm run dev            # http://localhost:3000
```

Toute la configuration (base de données, SMTP, URLs, secrets) vit dans un
seul fichier **`support-it/.env`** — lu à la fois par Next.js et par PHP
(`backend/config.php` le charge depuis cet emplacement). Ne jamais committer
ce fichier ; partir de `support-it/.env.example`.

## Structure du dépôt

```
backend/
  modele/          — un fichier PHP par action/endpoint (81 fichiers)
  modele/lib/       — logique pure extraite pour être testable (PHPUnit)
  config/           — session, CORS, CSRF, notifications, secrets
  migrations/        — chronologie SQL versionnée (voir migrations/README.md)
  ops/                — scripts de sauvegarde/restauration MySQL
  tests/               — tests PHPUnit
  index.js              — serveur Socket.IO (temps réel)

support-it/
  app/                  — pages Next.js App Router, une arborescence par rôle
  components/           — composants partagés (UI, Avatar, hooks de notifications)
  lib/                  — utilitaires frontend (CSRF, événements de notification)
  e2e/                   — tests Playwright (parcours critiques)

cybersecurity/
  script-test-instrusion/ — suite de tests de sécurité (Python), voir son propre README
  rapports/                 — résultats horodatés de chaque exécution
```

## Tests

- **Backend (PHPUnit)** : `cd backend && vendor/bin/phpunit` — couverture
  stratégique (pas exhaustive) sur la logique la plus sensible aux
  régressions silencieuses : comptage des messages non lus, portée
  directeur plateforme vs. client.
- **Frontend (Playwright, e2e)** : `cd support-it && npx playwright test` —
  parcours critiques (connexion). Tourne contre l'environnement local
  (MAMP + `npm run dev`), jamais contre la production.
- **Sécurité (boîte noire)** : `cd cybersecurity/script-test-instrusion &&
  python3 main.py --tout` — voir son propre README pour la configuration
  des comptes de test.

## Déploiement

Voir [`support-it/documentation/DEPLOIEMENT.md`](support-it/documentation/DEPLOIEMENT.md).
Déploiement manuel (pas de CI/CD) — c'est un choix assumé pour un
développement actuellement solo, documenté avec ses limites plutôt que
laissé implicite.

## Sauvegardes et restauration d'urgence

Voir [`backend/ops/RUNBOOK_BACKUP.md`](backend/ops/RUNBOOK_BACKUP.md).

## Schéma de base de données et migrations

Voir [`backend/migrations/README.md`](backend/migrations/README.md) —
chronologie reconstituée, y compris les tables historiquement créées sans
migration dédiée (directement en PHP).
