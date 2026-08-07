# Runbook — Sauvegarde et restauration MySQL

## État avant cette procédure

Aucun mécanisme de sauvegarde de base de données n'avait été identifié
dans le dépôt ni confirmé sur le serveur (audit technique, section base de
données). Ce runbook comble ce point.

**À vérifier en premier**, avant toute mise en place, pour éviter un
mécanisme redondant si l'hébergeur du VPS propose déjà des snapshots :

```bash
crontab -l          # cron déjà existant ?
ls -la /root/backups /var/backups 2>/dev/null   # dossier de backup déjà utilisé ?
```

## Scripts

- `backup_mysql.sh` — sauvegarde compressée (`mysqldump | gzip`), rotation
  automatique (7 quotidiennes + 4 hebdomadaires, conservées dans des
  sous-dossiers séparés). Lit les identifiants depuis `support-it/.env`
  (aucun secret dupliqué). Testé de bout en bout en local (MAMP,
  MySQL 8.0.44) le 06/08/2026.
- `restore_mysql.sh <fichier.sql.gz>` — restauration avec confirmation
  manuelle obligatoire (taper le nom exact de la base cible). Testé en
  local le 06/08/2026 (round-trip complet réussi).

## Mise en place sur le serveur de production

```bash
ssh root@srv-lyova01.lyovatech.net
cd /var/www/html/support/backend/ops
chmod +x backup_mysql.sh restore_mysql.sh

# Test manuel avant d'automatiser :
./backup_mysql.sh

# Vérifier le résultat :
ls -la backups/quotidien/
gunzip -c backups/quotidien/support_*.sql.gz | head -20   # doit ressembler à un dump SQL valide

# Une fois validé, cron quotidien à 3h du matin :
crontab -e
# Ajouter la ligne :
0 3 * * * /var/www/html/support/backend/ops/backup_mysql.sh >> /var/log/support_backup.log 2>&1
```

## Procédure d'urgence — restauration

1. **Ne pas paniquer, ne rien supprimer.** Vérifier d'abord l'étendue réelle
   du problème (`pm2 logs`, `pm2 status`, la base répond-elle encore à une
   requête simple ?).
2. Identifier la sauvegarde la plus récente et cohérente :
   ```bash
   ls -lt /var/www/html/support/backend/ops/backups/quotidien/
   ```
3. Prévenir les utilisateurs si possible avant de couper l'accès (perte de
   toute donnée créée entre la dernière sauvegarde et l'incident — c'est
   la nature même d'une restauration).
4. Restaurer :
   ```bash
   cd /var/www/html/support/backend/ops
   ./restore_mysql.sh backups/quotidien/support_<date>.sql.gz
   ```
5. Vérifier immédiatement : connexion, liste de tickets, un message de
   chat. Ne considérer l'incident clos qu'après ce contrôle manuel.
6. Documenter l'incident (cause, données perdues le cas échéant, date de
   la sauvegarde utilisée) — même sommairement, pour ne pas reperdre cette
   information la prochaine fois.

## Ce qui n'est PAS couvert par ce runbook

- Sauvegarde des fichiers uploadés (`support-it/public/photoprofil/`,
  pièces jointes de tickets) — hors périmètre de ce runbook, à couvrir
  séparément si jugé nécessaire (ces fichiers ne sont pas dans MySQL).
- Sauvegarde du code applicatif — déjà couvert par le dépôt Git (même s'il
  ne reflète pas parfaitement l'état déployé, voir audit technique §9).
