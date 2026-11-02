#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

# Run from a Swarm manager after exporting the non-secret .env.production values.
# Uses a service, not docker run, so the overlay need not be attachable.
action=${1:-up}
case "$action" in up|seed|status) ;; *) echo "Usage: sh deploy/migrate.sh [up|seed|status]" >&2; exit 2 ;; esac
: "${BULKBETS_API_IMAGE:?Set BULKBETS_API_IMAGE}"
: "${DB_HOST:?Set DB_HOST to the existing PostgreSQL service}"
job="${STACK_NAME:-bulkbets}-migrate-$(date -u +%Y%m%d%H%M%S)-$$"
cleanup() { docker service rm "$job" >/dev/null 2>&1 || true; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

docker service create --detach --with-registry-auth --name "$job" \
  --restart-condition none \
  --network portfolio_network \
  --secret bulkbets_db_password \
  --secret bulkbets_admin_password \
  --env "DB_HOST=$DB_HOST" --env "DB_PORT=${DB_PORT:-5432}" \
  --env "DB_USER=${DB_USER:-bulkbets}" --env "DB_NAME=${DB_NAME:-bulk_bets}" \
  --env "DB_SSL_ENABLED=${DB_SSL_ENABLED:-disable}" \
  --env DB_PASSWORD_FILE=/run/secrets/bulkbets_db_password \
  --env ADMIN_USER_PASSWORD_FILE=/run/secrets/bulkbets_admin_password \
  "$BULKBETS_API_IMAGE" /app/migrate -action "$action" >/dev/null

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
