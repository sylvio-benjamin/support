# Déploiement — Support LyovaTech

Déploiement **manuel**, directement en production. Aucun pipeline CI/CD, pas
d'environnement de recette intermédiaire — MAMP local est le seul garde-fou
avant la mise en ligne. C'est un choix assumé pour un développement
actuellement solo (voir audit technique), pas un oubli : ce document existe
pour rendre ce choix reproductible et sûr malgré tout, en documentant
précisément ce qui se fait déjà à la main.

## Prérequis côté serveur

- VPS `srv-lyova01.lyovatech.net`, accès SSH root.
- nginx (reverse proxy), PHP-FPM, PM2, Node.js 20+.
- `/var/www/html/support/` : racine du déploiement, avec `support-it/` et
  `backend/` en sous-dossiers.
- `support-it/.env` déjà présent sur le serveur (jamais écrasé par un
  déploiement — voir plus bas), avec `NODE_ENV=production`.

## Procédure standard

1. **Copier uniquement les fichiers modifiés**, jamais une synchronisation
   complète du dépôt (le serveur contient des fichiers que le dépôt n'a
   pas : `.env`, photos de profil uploadées, pièces jointes de tickets —
   une synchronisation complète les écraserait ou les supprimerait).
   ```bash
   rsync -avR --files-from=<manifeste_liste_de_fichiers>.txt . root@srv-lyova01.lyovatech.net:/var/www/html/support/
   ```
   Le manifeste liste un chemin relatif par ligne (ex.
   `backend/modele/fermerTicket.php`), lancé depuis la racine du dépôt.

2. **Backend PHP** : aucune étape supplémentaire — PHP-FPM sert les
   fichiers directement, sans build.

3. **Frontend Next.js** : rebuild + redémarrage obligatoires (les variables
   `NEXT_PUBLIC_*` sont figées dans le bundle au moment du build) :
   ```bash
   ssh root@srv-lyova01.lyovatech.net
   cd /var/www/html/support/support-it
   npm install    # si package.json a changé
   npm run build
   pm2 restart support-it
   ```

4. **Socket.IO** (`backend/index.js`), si modifié :
   ```bash
   pm2 restart support-ws
   ```

5. **Migrations SQL**, si une nouvelle migration a été ajoutée sous
   `backend/migrations/` : l'exécuter manuellement contre la production
   APRÈS avoir lu `backend/migrations/README.md` (certaines contiennent des
   `DROP TABLE`/`DELETE` qui ne doivent tourner qu'une fois, jamais
   rejouées bêtement).

## Vérifications après déploiement

```bash
pm2 status                          # les process concernés sont "online"
pm2 logs support-it --lines 50      # pas d'erreur au démarrage
pm2 logs support-ws --lines 20      # si le websocket a été touché
curl -sI https://support.lyovatech.com/connexion/lyovatech   # 200
```

Puis un test manuel réel dans le navigateur du parcours concerné par le
changement (pas seulement un curl qui vérifie que le serveur répond).

## Rollback manuel

Il n'existe pas de mécanisme automatisé. En cas de problème détecté après
déploiement :

1. Identifier la version précédente des fichiers touchés (historique Git
   local si le fichier y est suivi, ou une copie de sauvegarde manuelle
   faite avant le déploiement — **prendre l'habitude d'en faire une** :
   `cp fichier.php fichier.php.avant-deploi` avant toute modification
   risquée).
2. Redéployer cette version précédente avec la même procédure `rsync`
   ci-dessus.
3. Si le frontend est concerné : `npm run build && pm2 restart support-it`
   à nouveau, indispensable même pour revenir en arrière.
4. Si une migration SQL a été appliquée et cause le problème : voir
   `backend/ops/RUNBOOK_BACKUP.md` — une restauration complète depuis la
   dernière sauvegarde peut être nécessaire si la migration a modifié des
   données (pas seulement un schéma).

## Ce qui n'est pas couvert

Recette automatisée avant mise en ligne, environnement de staging,
notification automatique en cas d'échec de déploiement — voir le plan
d'action de l'audit technique pour la suite si ces points deviennent
prioritaires.
