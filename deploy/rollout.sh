#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

# Runs locally on a manager or through DOCKER_HOST=ssh://... from CI. No source
# files, application passwords or signing keys need to be copied to the VPS.
: "${GIT_COMMIT_HASH:?Set GIT_COMMIT_HASH to the published release tag}"
: "${APP_HOST:?Set APP_HOST to the frontend hostname without a scheme}"
: "${API_HOST:?Set API_HOST to the API hostname without a scheme}"
: "${DB_HOST:?Set DB_HOST to the infrastructure PostgreSQL service}"
: "${SMTP_ADDR:?Set SMTP_ADDR to the STARTTLS endpoint}"
: "${SMTP_FROM:?Set SMTP_FROM to a verified sender}"

for hostname in "$APP_HOST" "$API_HOST"; do
  case "$hostname" in
    ''|*[!A-Za-z0-9.-]*|.*|-*|*.|*-)
      echo "APP_HOST and API_HOST must be plain hostnames without schemes, ports or paths." >&2
      exit 2 ;;
  esac
done

export STACK_NAME="${STACK_NAME:-bulkbets}"
export API_IMAGE="${API_IMAGE:-ghcr.io/perrysmithmoss/bulkbets:${GIT_COMMIT_HASH}}"
export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-https://${APP_HOST}}"
timeout="${DEPLOY_TIMEOUT_SECONDS:-600}"
case "$timeout" in ''|*[!0-9]*|0) echo "DEPLOY_TIMEOUT_SECONDS must be positive." >&2; exit 2 ;; esac

if [ "$(docker info --format '{{.Swarm.ControlAvailable}}')" != true ]; then
  echo "The Docker connection must point to a Swarm manager." >&2
  exit 1
fi
docker network inspect bulkbets_ingress bulkbets_database >/dev/null
docker secret inspect bulkbets_runtime_db_password bulkbets_db_ca bulkbets_edge_proxy_secret bulkbets_db_password bulkbets_admin_password \
  bulkbets_access_token_secret bulkbets_refresh_token_secret \
  bulkbets_smtp_password >/dev/null
case "${PROVISION_DATABASE:-true}" in
  true)
    docker secret inspect "${DB_ADMIN_USER_SECRET:-postgres_user}" "${DB_ADMIN_PASSWORD_SECRET:-postgres_password}" >/dev/null ;;
  false) ;;
  *) echo 'PROVISION_DATABASE must be true or false.' >&2; exit 2 ;;
esac

set -- --compose-file docker-stack.yaml --compose-file deploy/docker-stack.smtp.yml
if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
  docker secret inspect bulkbets_google_client_secret >/dev/null
  set -- "$@" --compose-file deploy/docker-stack.oauth.yml
fi
# Resolve and validate every required setting before touching the database.
docker stack config "$@" >/dev/null
if [ "${PROVISION_DATABASE:-true}" = true ]; then sh deploy/migrate.sh provision; fi
sh deploy/migrate.sh up
sh deploy/migrate.sh seed
sh deploy/migrate.sh runtime-grants
docker stack deploy --with-registry-auth --resolve-image always --detach=true "$@" "$STACK_NAME"

service="${STACK_NAME}_api"
expected_image="${API_IMAGE:-ghcr.io/perrysmithmoss/bulkbets:${GIT_COMMIT_HASH}}"
deadline=$(( $(date +%s) + timeout ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  image=$(docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' "$service")
  case "$image" in
    "$expected_image"|"$expected_image"@*) ;;
    *) echo "Deployment did not retain the requested image; the service may have rolled back." >&2; exit 1 ;;
  esac
  state=$(docker service inspect --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{end}}' "$service")
  case "$state" in
    paused|rollback_*)
      echo "Swarm update failed: $state" >&2
      docker service ps --no-trunc "$service" >&2
      exit 1 ;;
  esac

  replicas=$(docker service inspect --format '{{.Spec.Mode.Replicated.Replicas}}' "$service")
  ready=0
  tasks=$(docker service ps --filter desired-state=running --format '{{.ID}}' "$service")
  for task in $tasks; do
    task_status=$(docker inspect --type task --format '{{.Status.State}} {{.Spec.ContainerSpec.Image}}' "$task")
    case "$task_status" in
      "running $expected_image"|"running $expected_image"@*) ready=$((ready + 1)) ;;
    esac
  done
  if [ "$ready" -ge "$replicas" ] && [ "$replicas" -gt 0 ]; then
    case "$state" in
      ''|completed)
        if curl --fail --silent --show-error --connect-timeout 5 --max-time 10 \
          "https://${API_HOST}/api/v1/health" >/dev/null 2>&1; then
          echo "Deployment healthy: $expected_image"
          exit 0
        fi ;;
    esac
  fi
  sleep 5
done

echo "Timed out waiting for the requested image and public API health." >&2
docker service ps --no-trunc "$service" >&2
docker service logs --tail 50 "$service" >&2 || true
exit 1
