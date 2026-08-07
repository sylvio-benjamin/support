#!/usr/bin/env bash
# Restauration MySQL — Support LyovaTech
#
# Usage : ./restore_mysql.sh <chemin_vers_dump.sql.gz>
#
# ATTENTION : écrase le contenu actuel de la base cible. Confirmation
# manuelle obligatoire avant exécution (pas de --force, volontairement).

set -euo pipefail

DUMP_FILE="${1:-}"
if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Usage : $0 <chemin_vers_dump.sql.gz>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/support-it/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Erreur : $ENV_FILE introuvable." >&2
  exit 1
fi

DB_HOST=$(grep -E '^DB_HOST=' "$ENV_FILE" | cut -d '=' -f2-)
DB_PORT=$(grep -E '^DB_PORT=' "$ENV_FILE" | cut -d '=' -f2-)
DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | cut -d '=' -f2-)
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2-)
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | cut -d '=' -f2-)

echo "Cible : base '$DB_NAME' sur $DB_HOST:${DB_PORT:-3306}"
echo "Source : $DUMP_FILE"
echo ""
echo "⚠️  Cette opération VA ÉCRASER le contenu actuel de '$DB_NAME'."
read -r -p "Taper EXACTEMENT le nom de la base pour confirmer ($DB_NAME) : " CONFIRM
if [ "$CONFIRM" != "$DB_NAME" ]; then
  echo "Confirmation invalide, annulation."
  exit 1
fi

gunzip -c "$DUMP_FILE" | mysql \
  --host="$DB_HOST" --port="${DB_PORT:-3306}" \
  --user="$DB_USER" --password="$DB_PASSWORD" \
  "$DB_NAME"

echo "Restauration terminée : $(date)"
echo "Vérifier immédiatement l'application (connexion, liste de tickets) avant de considérer l'incident clos."
