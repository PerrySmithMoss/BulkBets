#!/bin/sh
set -eu
umask 077
cd "$(dirname "$0")/.."
: "${POSTGRES_SERVICE:?Set POSTGRES_SERVICE to the infrastructure Swarm PostgreSQL service name}"
containers=$(docker ps --filter "label=com.docker.swarm.service.name=$POSTGRES_SERVICE" --format '{{.ID}}')
count=$(printf '%s\n' "$containers" | awk 'NF { n++ } END { print n+0 }')
if [ "$count" -ne 1 ]; then
  echo "Run this script on the VPS node hosting the single PostgreSQL task for $POSTGRES_SERVICE." >&2
  exit 1
fi
mkdir -p backups
backup_path="backups/bulkbets-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
trap 'rm -f "$backup_path.tmp"' EXIT
# These existing infrastructure secrets are read inside its own Postgres task.
# No password appears in host command arguments, shell history or the dump output.
docker exec "$containers" sh -c '
  PGPASSWORD=$(cat /run/secrets/postgres_password)
  export PGPASSWORD
  exec pg_dump -U "$(cat /run/secrets/postgres_user)" -d "$1" -Fc
' sh "${DB_NAME:-bulk_bets}" > "$backup_path.tmp"
mv "$backup_path.tmp" "$backup_path"
echo "Backup saved to $backup_path"
