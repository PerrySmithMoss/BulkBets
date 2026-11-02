# Portfolio deployment

BulkBets is a virtual-money showcase. There is no payment processor, bank transfer,
cash redemption, or real-money operating mode. Keep the demo notices visible.

## Run locally

Follow the root README to install dependencies, migrate and seed the database.
Registered customers and guest demos can use the wallet and event studio. The
bootstrap admin retains its protected, ordinary-account result-publication API;
use **Try demo** to explore the public portfolio experience.

The studio creates private shows with fictional starter athletes. Edit the show,
add divisions and athletes, change odds, suspend/reopen betting, and select winners.
Use **Open event market** to place bets. **Preview settlement** rolls back every
change. **Run event** closes betting and persists a five-second judging deadline.
The API's background worker publishes the outcome and pays virtual returns, including
stakes. Restarting the API resumes overdue events. Cancellations refund singles;
voided accumulator legs count at decimal odds 1.00. Completed events cannot restart.

Historical replays support favourites, outsiders and cancellation scenarios without
changing the shared fixture data. Studio events never settle through the historical
replay button. **Reset my demo** clears that account's bets, transfers and private
events, restores £1,000, and leaves its login and other visitors intact.

## Vercel frontend + existing VPS infrastructure

The supplied stack targets your existing **Docker Swarm** infrastructure:
`portfolio_network`, Traefik entrypoint `websecure`, certificate resolver
`myresolver`, and the existing PostgreSQL 17 service. It adds only the BulkBets API.
It does not deploy a second database, proxy, or frontend container. Service labels
are under `deploy.labels`, as required by the Traefik Swarm provider. The API has
no published host port; Traefik routes its `/api/v1` endpoints on `API_HOST`.

Traffic flows as follows:

```text
Browser -> Vercel frontend (/api/*) -> https://API_HOST -> Traefik -> Go API -> existing Postgres
Native Expo app --------------------> https://API_HOST/api/v1
```

The existing infrastructure stack remains separate. PostgreSQL service DNS is
normally `<infra-stack-name>_postgres`; use `docker service ls` to find its exact
name. The overlay can remain non-attachable: migration jobs run as Swarm services.
Run the Swarm commands on a manager. Registry images must match the VPS CPU
architecture; building on an Apple Silicon laptop requires a buildx target for an
amd64 VPS (or build directly on the VPS).

### 1. Configure non-secret values

The stack and migration helper read exported environment variables; no production
example file is required. Set these values in your VPS deployment shell or CI
configuration before running the commands below:

```sh
export STACK_NAME=bulkbets
export APP_HOST=bulkbets.your-domain.example
export API_HOST=api.bulkbets.your-domain.example
export BULKBETS_API_IMAGE=ghcr.io/perrysmithmoss/bulkbets-api:REPLACE_WITH_RELEASE_TAG
export DB_HOST=infra_postgres
export POSTGRES_SERVICE="$DB_HOST"
export DB_USER=bulkbets
export DB_NAME=bulk_bets
export DB_PORT=5432
export DB_SSL_ENABLED=disable
export CORS_ALLOWED_ORIGINS="https://${APP_HOST}"
```

- `APP_HOST`: your Vercel frontend hostname, without scheme or trailing slash.
- `API_HOST`: a separate DNS hostname pointing to your VPS, without a scheme.
- `BULKBETS_API_IMAGE`: an immutable release tag you will build and push.
- `DB_HOST` / `POSTGRES_SERVICE`: replace `infra_postgres` with the actual
  `<infrastructure-stack>_postgres` service name from `docker service ls`.
- `DB_USER` / `DB_NAME`: your dedicated BulkBets database login/database.
- `CORS_ALLOWED_ORIGINS`: exact browser origins; append a stable preview if needed.

Repeat these exports in each deployment shell, or persist the non-secret settings
in your deployment tooling. Passwords and signing keys belong in the Swarm secrets
created below. `docker stack deploy` does not automatically load Compose's `.env`
file; keep the settings exported for stack interpolation and the helper scripts.
`DB_SSL_ENABLED=disable` matches your same-VPS private overlay. For a database
across untrusted networks, configure database TLS and CA trust before connecting.

### 2. Create a dedicated database and Swarm secrets

Using an interactive `psql` session in the existing PostgreSQL task, connect as its
infrastructure administrator to database `postgres`. Read that administrator's
username/password from the existing `/run/secrets/postgres_user` and
`/run/secrets/postgres_password` inside the Postgres container. Then run:

```sql
CREATE ROLE bulkbets LOGIN;
\password bulkbets
CREATE DATABASE bulk_bets OWNER bulkbets;
```

Choose a unique database password of at least 16 characters and enter it at the
`\password` prompt, which avoids a password in SQL history. Use the same password
for `bulkbets_db_password` below. The dedicated login owns its database and can
install the trusted extensions used by the migrations. Do not grant superuser or
mount infrastructure administrator secrets in the API.

Create the application secrets on the Swarm manager. This example runs in bash;
enter passwords interactively rather than putting them in command history:

```bash
read -rsp 'BulkBets database password: ' bulkbets_db_password; printf '\n'
printf '%s' "$bulkbets_db_password" | docker secret create bulkbets_db_password -
unset bulkbets_db_password
read -rsp 'BulkBets bootstrap admin password: ' bulkbets_admin_password; printf '\n'
printf '%s' "$bulkbets_admin_password" | docker secret create bulkbets_admin_password -
unset bulkbets_admin_password
openssl rand -hex 32 | docker secret create bulkbets_access_token_secret -
openssl rand -hex 32 | docker secret create bulkbets_refresh_token_secret -
```

Keep the admin password in a password manager. The initial migration creates
`admin@bulkbets.com`; the admin password secret is mounted only into migration
jobs. Existing admin accounts are not reset by changing that secret. Secret values
are loaded from files, so passwords need no URL escaping in deployment config.
Docker secrets are immutable; rotate them with new names and update the stack's
secret mappings plus migration helper before removing old versions.

### 3. Build/push, migrate, then start the API

Build on the VPS (or use buildx with the correct `--platform` from your workstation).
Log in to the chosen registry on the manager if the image is private:

```sh
docker build -t "$BULKBETS_API_IMAGE" ./server
docker push "$BULKBETS_API_IMAGE"
sh deploy/migrate.sh up
sh deploy/migrate.sh seed
docker stack config --compose-file docker-stack.production.yml
docker stack deploy --with-registry-auth --compose-file docker-stack.production.yml "$STACK_NAME"
docker service ps "${STACK_NAME}_api"
docker service logs --tail 100 "${STACK_NAME}_api"
curl --fail "https://${API_HOST}/api/v1/health"
```

Swarm consumes the published image; it does not run `build` or wait for Compose
`depends_on`. The migration helper waits for completion, reports failures, and
removes its own temporary service. It never starts a second PostgreSQL container.
Migrations run before the API upgrade. Back up before upgrading an existing
installation and keep migrations compatible with the API being replaced. For an
application-only rollback, use `docker service rollback "${STACK_NAME}_api"`;
this does not revert database changes.

### 4. Deploy Next.js on Vercel

Import this repository, choose **Root Directory: `web`**, the Next.js preset and
Node.js 24. Set the server-side environment variable `API_URL=https://API_HOST`
with your real API hostname, without `/api/v1`, then deploy. Add the hostname from
`APP_HOST` to the Vercel project and follow Vercel's DNS instructions. Do not point
that frontend DNS record at the VPS. The API DNS record points at the VPS where
Traefik already handles TLS.

`API_URL` is used by both Next server requests and the external `/api/:path*`
rewrite. Redeploy after changing it. A Vercel build fails early if the origin is
missing, insecure, or contains a path/credentials. No database, SMTP or signing
secret belongs in Vercel or a `NEXT_PUBLIC_` variable. On Vercel the app uses the
native Next build; standalone output remains available for local Docker testing.

Browser fetches stay relative to `/api`, and cookies remain host-only, Secure and
HttpOnly on the frontend hostname. API responses and the rewrite explicitly
disable caching. Password reset links and Google callbacks use `APP_CLIENT_URL`,
which the stack derives from the frontend `APP_HOST`; the backend's `APP_HOST`
setting instead uses `API_HOST` for token issuer identity.

The default CORS origin is the production frontend. Add any **exact** stable
preview origin to `CORS_ALLOWED_ORIGINS` and redeploy the API before testing auth
there. Do not permit every `*.vercel.app` project. Reset links/OAuth still use the
configured production frontend; use a separate staging backend if previews need
their own redirect domain. Vercel Deployment Protection may require a logged-in
browser to access a protected preview's callbacks.

### Optional SMTP and Google OAuth

For Resend, verify the sender domain and export these non-secret settings:

```sh
export SMTP_ADDR=smtp.resend.com:587
export SMTP_FROM=noreply@bulkbets.perrysmithmoss.com
export SMTP_USERNAME=resend
```

Use your verified sender if deploying with a different domain. Store a sending API
key in the `bulkbets_smtp_password` Swarm secret using the hidden-prompt pattern
above. Include the SMTP overlay on every deployment that enables email:

```sh
docker stack deploy --with-registry-auth \
  --compose-file docker-stack.production.yml \
  --compose-file deploy/docker-stack.smtp.yml "$STACK_NAME"
```

Production SMTP requires STARTTLS. After deployment, use a controlled test inbox
and confirm the reset email is delivered, the link opens the deployed frontend,
the new password works, the old password fails and the link cannot be reused.
The automated suite uses isolated reset fixtures and in-process SMTP tests; it
does not establish production email delivery.

For Google, export `GOOGLE_CLIENT_ID`, create `bulkbets_google_client_secret`, add
`--compose-file deploy/docker-stack.oauth.yml`, and register the redirect URI
`https://YOUR_FRONTEND_HOST/api/v1/oauth2/google/callback` with Google. Both optional
overlays can be passed together. Omit the OAuth overlay when Google isn't enabled.

### Rate limiting

The API does not trust caller-supplied address headers (`TRUST_EDGE=false`), since
the API hostname is public. Anonymous limits can group requests behind Vercel or
Traefik egress; authenticated action budgets additionally distinguish accounts.
Limits are bounded, in process, and reset on restart. The supplied stack starts
one API replica. Configure a trusted edge address policy and shared rate limits
before scaling or relying on per-visitor IP limits across proxies. The existing
Traefik stack is not modified by this repository.

## Backups and recovery

On the VPS node hosting the PostgreSQL task, export `POSTGRES_SERVICE` and
`DB_NAME` from the non-secret deployment configuration, then run:

```sh
sh deploy/backup.sh
```

The helper locates only that local Swarm task and reads its existing administrator
secrets inside the container. It creates a private custom-format dump of **only**
the BulkBets database in the Git-ignored `backups/` directory. It does not require
an attachable overlay or expose credentials in host arguments. Copy backups to
encrypted storage off the VPS. Schedule the helper with your own host scheduler
and select retention/frequency; the repository does not install a cron job.

Test restore into a separate empty database before relying on a backup. Create a
replacement database owned by the BulkBets role using the same administrator
session as above, find the exact PostgreSQL task container ID with `docker ps`,
and deliberately set `POSTGRES_CONTAINER` and `RESTORE_DB`. For that selected
replacement database only:

```sh
: "${POSTGRES_CONTAINER:?Select the PostgreSQL task container}"
: "${RESTORE_DB:?Select a separate empty replacement database}"
docker exec -i "$POSTGRES_CONTAINER" sh -c '
  PGPASSWORD=$(cat /run/secrets/postgres_password)
  export PGPASSWORD
  exec pg_restore -U "$(cat /run/secrets/postgres_user)" -d "$1" \
    --exit-on-error --no-owner --role="$2"
' sh "$RESTORE_DB" "$DB_USER" < backups/SELECTED_BACKUP.dump
```

Use the dedicated database role during restore so its objects remain writable by
the API. Validate the restored database before switching the API's `DB_NAME` and
redeploying. Do not remove the existing infrastructure's PostgreSQL volume or run
`docker compose down -v` against it. Backups and the infrastructure stack remain
independent of application service redeployments.

## Monitoring and retention

Monitor both `https://API_HOST/api/v1/health` and
`https://FRONTEND_HOST/api/v1/health`. The endpoint returns 503 if Postgres is
unavailable. Swarm replaces unhealthy tasks; the stack rolls back failed API
updates. Inspect logs with `docker service logs --tail 100 "${STACK_NAME}_api"`.
Request logs contain path, status, duration and request ID; query strings, OAuth
codes, passwords and tokens are omitted. Alert on worker failures and repeated
HTTP errors. Health checks do not establish backup integrity or restore a failed
database. Configure external monitoring separately.

An hourly cleanup removes at most 100 guest accounts idle for 30 days, including
their private events, bets and receipts. Registered/OAuth accounts are retained.
Signing out or resetting a demo does not delete a registered account. Explain
the collected data and retention policy on your public portfolio.

## Mobile

For native builds, set `EXPO_PUBLIC_API_URL=https://API_HOST/api/v1` before
export/build. Native development defaults to `http://localhost:8080/api/v1`;
physical devices need a reachable address, and Android emulators normally use
`10.0.2.2` for the host. Rebuild after changing the embedded environment value.
Use the web reset link, then sign in again on mobile.

For an optional Expo web showcase, create a **separate Vercel project** with Root
Directory `mobile`, build command `npm run export:web` and Output Directory `dist`.
Use `mobile/vercel.json.example` as a template: replace the API origin and copy it
to `mobile/vercel.json` before deployment. Keep browser API calls same-origin;
`EXPO_PUBLIC_API_URL=/api/v1` does that (and is the default for web). Add the exact
Expo web frontend origin to the API's CORS list. The SPA fallback belongs after
the API rewrite. Vercel's explicit no-cache headers also cover the Expo API proxy.

The browser suite tests Expo web's API integration, and native exports verify both
bundles. Validate session behavior and layout on real iOS/Android devices before
native distribution. These deployment files do not publish native store apps.

## Verification

`npm --prefix web run test:e2e` starts an isolated database, applies migrations and
seeds, then runs the Go storage integration tests with the race detector before
the browser tests. It covers concurrent wallet operations, settlement retries,
atomic results, private-event isolation, preview rollback and voided accumulator
legs. It never uses the development database and needs no local Go installation.
Set `BULKBETS_TEST_POSTGRES_IMAGE=postgres:17.4` to target your VPS database version;
CI uses that version, while local development defaults to Postgres 18.6.
GitHub Actions also runs lint, type checks, Go checks, unit tests and native exports.

References: [Traefik Swarm provider](https://doc.traefik.io/traefik/v3.6/reference/install-configuration/providers/swarm/),
[Docker Swarm secrets](https://docs.docker.com/engine/swarm/secrets/),
[Vercel external rewrites](https://vercel.com/docs/routing/rewrites).
