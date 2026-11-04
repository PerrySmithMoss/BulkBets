#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

# Run from a Swarm manager after exporting the non-secret deployment settings.
# Uses a service, not docker run, so the overlay need not be attachable.
action=${1:-up}
case "$action" in provision|up|seed|status) ;; *) echo "Usage: sh deploy/migrate.sh [provision|up|seed|status]" >&2; exit 2 ;; esac
api_image="ghcr.io/perrysmithmoss/bulkbets:${GIT_COMMIT_HASH:-latest}"
: "${DB_HOST:?Set DB_HOST to the existing PostgreSQL service}"
job="${STACK_NAME:-bulkbets}-migrate-$(date -u +%Y%m%d%H%M%S)-$$"
# Invoked indirectly by the EXIT trap, including failed provisioning jobs.
# shellcheck disable=SC2329
cleanup() { docker service rm "$job" >/dev/null 2>&1 || true; }
trap 'cleanup' EXIT
trap 'exit 1' HUP INT TERM

# Only the temporary provisioning job can read infrastructure administrator
# secrets. Migrations and the long-running API use the dedicated application role.
if [ "$action" = provision ]; then
  set -- --secret "source=${DB_ADMIN_USER_SECRET:-postgres_user},target=postgres_user" \
    --secret "source=${DB_ADMIN_PASSWORD_SECRET:-postgres_password},target=postgres_password" \
    --env DB_ADMIN_USER_FILE=/run/secrets/postgres_user \
    --env DB_ADMIN_PASSWORD_FILE=/run/secrets/postgres_password
else
  set -- --secret bulkbets_admin_password \
    --env ADMIN_USER_PASSWORD_FILE=/run/secrets/bulkbets_admin_password
fi

docker service create --detach --with-registry-auth --name "$job" \
  --restart-condition none \
  --network portfolio_network \
  --secret bulkbets_db_password \
  "$@" \
  --env "DB_HOST=$DB_HOST" --env "DB_PORT=${DB_PORT:-5432}" \
  --env "DB_USER=${DB_USER:-bulkbets}" --env "DB_NAME=${DB_NAME:-bulk_bets}" \
  --env "DB_SSL_ENABLED=${DB_SSL_ENABLED:-disable}" \
  --env DB_PASSWORD_FILE=/run/secrets/bulkbets_db_password \
  "$api_image" /app/migrate -action "$action" >/dev/null

remaining=600
while [ "$remaining" -gt 0 ]; do
  task=$(docker service ps --no-trunc --format '{{.ID}}' "$job" | head -n 1)
  if [ -n "$task" ]; then
    state=$(docker inspect --type task --format '{{.Status.State}}' "$task")
    case "$state" in
      complete) docker service logs --raw "$job"; exit 0 ;;
      failed|rejected|orphaned)
        docker service logs --raw "$job" || true
        docker service ps --no-trunc "$job" >&2
        exit 1 ;;
    esac
  fi
  sleep 2
  remaining=$((remaining - 2))
done
echo "Migration timed out; inspect the database before retrying." >&2
docker service logs --raw "$job" || true
exit 1
