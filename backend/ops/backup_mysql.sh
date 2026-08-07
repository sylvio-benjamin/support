#!/usr/bin/env bash
# Sauvegarde MySQL — Support LyovaTech
#
# Usage : ./backup_mysql.sh
# Prévu pour un cron quotidien sur le VPS de production. Lit les
# identifiants depuis support-it/.env (même fichier que backend/config.php),
# aucun secret dupliqué dans ce script.
#
# Rotation : 7 sauvegardes quotidiennes + 4 hebdomadaires (dimanche),
# conservées séparément pour ne pas perdre toute l'historique après une
# semaine si un incident n'est détecté que tardivement.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/support-it/.env"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backend/ops/backups}"
DAILY_DIR="$BACKUP_DIR/quotidien"
WEEKLY_DIR="$BACKUP_DIR/hebdomadaire"
DAILY_KEEP=7
WEEKLY_KEEP=4

if [ ! -f "$ENV_FILE" ]; then
  echo "Erreur : $ENV_FILE introuvable." >&2
  exit 1
fi

# Charge uniquement les variables DB_* du .env (évite d'exporter tout le
# fichier, qui contient aussi des secrets SMTP/API sans rapport).
DB_HOST=$(grep -E '^DB_HOST=' "$ENV_FILE" | cut -d '=' -f2-)
DB_PORT=$(grep -E '^DB_PORT=' "$ENV_FILE" | cut -d '=' -f2-)
DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | cut -d '=' -f2-)
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2-)
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | cut -d '=' -f2-)

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
  echo "Erreur : DB_NAME ou DB_USER manquant dans $ENV_FILE." >&2
  exit 1
fi

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
DAY_OF_WEEK="$(date +%u)" # 1=lundi ... 7=dimanche
FILENAME="support_${TIMESTAMP}.sql.gz"

# --no-tablespaces : évite une erreur "PROCESS privilege" sur les comptes
# applicatifs non-root (ex. pma4support) qui n'ont pas ce droit global —
# sans rapport avec les données/schéma réels, qui sont dumpés normalement.
mysqldump \
  --host="$DB_HOST" --port="${DB_PORT:-3306}" \
  --user="$DB_USER" --password="$DB_PASSWORD" \
  --single-transaction --routines --triggers --events --no-tablespaces \
  "$DB_NAME" | gzip > "$DAILY_DIR/$FILENAME"

echo "Sauvegarde créée : $DAILY_DIR/$FILENAME ($(du -h "$DAILY_DIR/$FILENAME" | cut -f1))"

# Copie hebdomadaire le dimanche (jour 7), conservée plus longtemps.
if [ "$DAY_OF_WEEK" = "7" ]; then
  cp "$DAILY_DIR/$FILENAME" "$WEEKLY_DIR/$FILENAME"
  echo "Copie hebdomadaire créée : $WEEKLY_DIR/$FILENAME"
fi

# Rotation : ne garde que les N plus récentes dans chaque dossier.
cleanup() {
  local dir="$1" keep="$2"
  # `|| true` en bout de pipe : sous set -e/pipefail, `ls` qui ne matche
  # aucun fichier (dossier avec moins de $keep sauvegardes) ferait échouer
  # tout le script sans ça — ce n'est pas une erreur réelle.
  # shellcheck disable=SC2012
  { ls -1t "$dir"/support_*.sql.gz 2>/dev/null | tail -n +"$((keep + 1))" | while read -r old; do
    rm -f "$old"
    echo "Supprimée (rotation) : $old"
  done; } || true
}
cleanup "$DAILY_DIR" "$DAILY_KEEP"
cleanup "$WEEKLY_DIR" "$WEEKLY_KEEP"

echo "Sauvegarde terminée avec succès : $(date)"
