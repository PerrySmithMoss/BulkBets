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
dedicated `bulkbets_ingress` and `bulkbets_database` overlays, Traefik entrypoint `websecure`, certificate resolver
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
export GIT_COMMIT_HASH=REPLACE_WITH_RELEASE_COMMIT_SHA
export DB_HOST=infra_postgres
export POSTGRES_SERVICE="$DB_HOST"
export DB_USER=bulkbets
export DB_NAME=bulk_bets
export DB_PORT=5432
export DB_SSL_ENABLED=verify-full
export CORS_ALLOWED_ORIGINS="https://${APP_HOST}"
```

- `APP_HOST`: your Vercel frontend hostname, without scheme or trailing slash.
- `API_HOST`: a separate DNS hostname pointing to your VPS, without a scheme.
- `GIT_COMMIT_HASH`: the immutable image tag you will build and push to
  `ghcr.io/perrysmithmoss/bulkbets`. The stack and migration helper use this same
  tag. If omitted, both use `latest`; use a commit tag for repeatable deployments.
- `DB_HOST` / `POSTGRES_SERVICE`: replace `infra_postgres` with the actual
  `<infrastructure-stack>_postgres` service name from `docker service ls`.
- `DB_USER` / `DB_NAME`: migration owner (`bulkbets`) and database. The API always uses the separate `bulkbets_runtime` login.
- `CORS_ALLOWED_ORIGINS`: exact browser origins; append a stable preview if needed.

Repeat these exports in each deployment shell, or persist the non-secret settings
in your deployment tooling. Passwords and signing keys belong in the Swarm secrets
created below. `docker stack deploy` does not automatically load Compose's `.env`
file; keep the settings exported for stack interpolation and the helper scripts.
Service-level `env_file` injects container variables; it does not supply those
Swarm substitutions. The production stack intentionally lists its environment
explicitly. Do not load the local development `.env` into the API service: its
password values would conflict with the `_FILE` secret settings. Deployment
tooling may load a separate set of non-secret settings into the shell before
running `docker stack deploy`.

BulkBets reads Docker secret files through `DB_PASSWORD_FILE`,
`ACCESS_TOKEN_SECRET_FILE`, `REFRESH_TOKEN_SECRET_FILE`, `SMTP_PASSWORD_FILE` and
`GOOGLE_CLIENT_SECRET_FILE`. Setting `DB_PASSWORD=/run/secrets/...` would pass that
literal path as the password. The stack's `_FILE` values are intentional.

The API and migration jobs require `verify-full` TLS using the `bulkbets_db_ca` Swarm secret. The certificate SAN must match `DB_HOST`. Infrastructure HBA rules reject plaintext BulkBets logins and connections to other databases.

### 2. Create Swarm secrets; the deployment provisions the database

You do not need to create the BulkBets role or database manually. Before migrations,
`sh deploy/migrate.sh provision` runs a temporary job from the published API image.
By default it uses the existing infrastructure secrets `postgres_user` and
`postgres_password` to connect to database `postgres` on `DB_HOST`. Alternatively,
set `DB_ADMIN_USER_SECRET` and `DB_ADMIN_PASSWORD_SECRET` to the names of Docker
secrets for a dedicated provisioning login. These secrets must already exist in
the same Swarm; their values never enter GitHub Actions settings.
The provisioning job alone receives them. Migrations use the schema owner; the API uses `bulkbets_runtime` and never mounts owner or infrastructure administrator credentials.

The current VPS deployment selects `bulkbets_provisioner_user` and
`bulkbets_provisioner_password`. They authenticate `bulkbets_provisioner`, a
dedicated LOGIN with CREATEDB and CREATEROLE, without SUPERUSER, REPLICATION or
BYPASSRLS. The job opts into SET membership only for roles it creates, allowing
the application role to own its database. This avoids depending on a stale shared
administrator password and does not rotate credentials used by other apps.

To configure the same arrangement on a fresh VPS, use a trusted administrator
`psql` session to create the provisioning login, then set its password with
`\password bulkbets_provisioner` and store the matching username/password in the
two Docker secrets above:

```sql
CREATE ROLE bulkbets_provisioner LOGIN CREATEDB CREATEROLE NOSUPERUSER
  NOREPLICATION NOBYPASSRLS NOINHERIT;
```

Set the two secret-name overrides as GitHub Actions repository variables. Do not
store their credential values in GitHub variables or mount them into the API.

The job creates `DB_USER` and `DB_NAME` only when missing, with the new role's
password taken from `bulkbets_db_password`. Choose a unique password of at least
16 characters and store it in that secret before the first deployment. A generated
ASCII password from a password manager is suitable. The dedicated login owns its
database and can install the trusted extensions used by the migrations, without
superuser, role-creation or database-creation privileges.

Existing passwords, data, ownership and privileges are never reset. The job checks
database ownership, the role's LOGIN flag, absence of elevated privileges/role
memberships, and an actual application login. A mismatch fails deployment and
requires an explicit correction; it does not adopt another application's database
or silently rotate credentials. A session advisory lock serializes provisioning
jobs, and CREATE DATABASE runs outside a transaction. New passwords are converted
to SCRAM verifiers in Go before entering SQL; plaintext passwords are not placed
in statement logs. Provisioning errors omit driver messages that might contain
credentials. No additional database container or host port is created.

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

### Additional production prerequisites

The infrastructure repository defines the TLS server certificate/key and HBA configuration. Create non-attachable encrypted overlay networks once:

```sh
docker network create --driver overlay --subnet 10.42.10.0/24 --opt encrypted bulkbets_ingress
docker network create --driver overlay --subnet 10.42.11.0/24 --opt encrypted bulkbets_database
```

Only Traefik and the API join ingress; only PostgreSQL, the API, and temporary migration jobs join the database network. Never attach unrelated applications to these networks. The trusted ingress CIDR in the API must match this configuration.

Using trusted database administration, create `bulkbets_runtime` with LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION and NOBYPASSRLS, without role memberships. Store its random password in `bulkbets_runtime_db_password`. The deployment grants data operations after each migration, excluding Goose metadata; it does not grant schema ownership or CREATE.

Additional Swarm secrets: `bulkbets_db_ca` (public CA certificate), `bulkbets_db_cert` (server certificate), `bulkbets_db_key` (server private key, PostgreSQL UID 999, mode 0400), and `bulkbets_edge_proxy_secret` (random signing key). The edge key must also be a **server-only production** Vercel environment variable named `EDGE_PROXY_SECRET`; never prefix it with NEXT_PUBLIC or EXPO_PUBLIC. Do not put it in Preview environments that execute unreviewed branches. The proxy discards incoming assertions and signs Vercel's own visitor IP, method, path and timestamp. The API verifies signatures and freshness. Direct native requests use the trusted ingress's rightmost forwarded address.

The November 2026 database certificate expires February 6, 2029; renew before then using versioned Docker secrets, preserving CA trust during rotation. No scheduled backups are configured: the owner explicitly opted out for this portfolio. Take a temporary verified recovery copy before shared database maintenance.

### 3. Build/push, provision, migrate, then start the API

Build on the VPS (or use buildx with the correct `--platform` from your workstation).
Log in to the chosen registry on the manager if the image is private:

```sh
bulkbets_image="ghcr.io/perrysmithmoss/bulkbets:${GIT_COMMIT_HASH:-latest}"
docker build -t "$bulkbets_image" ./server
docker push "$bulkbets_image"
sh deploy/migrate.sh provision
sh deploy/migrate.sh up
sh deploy/migrate.sh seed
sh deploy/migrate.sh runtime-grants
docker stack config --compose-file docker-stack.yaml
docker stack deploy --with-registry-auth --compose-file docker-stack.yaml "$STACK_NAME"
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

### Automated deployment with GitHub Actions

[`.github/workflows/pipeline.yaml`](../.github/workflows/pipeline.yaml) runs on
pull requests and pushes to **master**. Every run checks Go, web/mobile lint and
types, unit tests, native exports, and the isolated browser/storage suite against
PostgreSQL 17.11. Every successful master push then publishes
`ghcr.io/perrysmithmoss/bulkbets` with the commit SHA and `latest` tags and deploys
the API. This includes frontend/test fixes, so they can unblock an earlier failed
release without another backend edit. Pull requests only run validation and E2E.
After a healthy API deployment, CI fast-forwards the `production` branch tracked by Vercel. Only that branch deploys the public frontend; do not push to it manually. **Run workflow** on master
also runs the full build/deploy without requiring a new commit.

The deployment job connects to the existing Swarm manager using Docker over SSH,
checks the overlay and external secrets, provisions missing database objects,
runs migrations, idempotent seeds and runtime grants,
then deploys the base stack plus the SMTP overlay. Setting `GOOGLE_CLIENT_ID` also
includes the OAuth overlay. The job waits for the requested image's running tasks,
a completed Swarm update and a successful public HTTPS health check. An automatic
rollback, paused update, wrong image or failed health check fails the job.
Production runs are serialized and are not cancelled midway by later pushes.

Before the first run, create the application Docker secrets from section 2 and
configure API DNS for Traefik. The database/role are provisioned automatically using
the existing infrastructure administrator secrets. The workflow does not recreate
PostgreSQL or Traefik, or store application credentials in GitHub.

In **BulkBets → Settings → Secrets and variables → Actions**, configure:

| Repository secret | Purpose |
| --- | --- |
| `VPS_IP` | VPS IP address or SSH hostname |
| `DEPLOY_SSH_PRIVATE_KEY` | The deploy user's SSH private key, as in your existing VPS setup |
| `VPS_KNOWN_HOSTS` | Required verified known_hosts entry; deployment fails if absent |
| `GHCR_READ_TOKEN` (optional) | Classic personal access token with `read:packages` for durable private-image pulls; see below |

The deploy user must have Docker access on the Swarm manager. Secrets configured
only in another repository are not automatically available to BulkBets; add them
here or grant this repository access through organization secrets.

| Repository variable | Required/default |
| --- | --- |
| `APP_HOST` | **Required:** Vercel frontend hostname, without scheme/path |
| `API_HOST` | **Required:** API hostname pointing at the VPS, without scheme/path |
| `DB_HOST` | **Required:** existing PostgreSQL Swarm DNS name, e.g. `infra_postgres` |
| `CORS_ALLOWED_ORIGINS` | Defaults to `https://APP_HOST`; use comma-separated exact origins for additional frontends |
| `DB_USER`, `DB_NAME`, `DB_PORT` | Defaults: `bulkbets`, `bulk_bets`, `5432` |
| `DB_SSL_ENABLED` | Production helpers enforce `verify-full`; local development can use `disable` |
| `DB_ADMIN_USER_SECRET`, `DB_ADMIN_PASSWORD_SECRET` | Defaults: `postgres_user`, `postgres_password`; current VPS overrides: `bulkbets_provisioner_user`, `bulkbets_provisioner_password` |
| `SMTP_ADDR`, `SMTP_USERNAME` | Defaults: `smtp.resend.com:587`, `resend` |
| `SMTP_FROM` | Defaults to `noreply@bulkbets.perrysmithmoss.com`; must be a verified sender |
| `GOOGLE_CLIENT_ID` | Optional; enables the OAuth overlay when nonempty |
| `VPS_SSH_USER`, `VPS_SSH_PORT` | Defaults: `deploy`, `22` |
| `GHCR_USERNAME` | Defaults to the workflow actor; set to the owner of `GHCR_READ_TOKEN` if using one |

The SHA tag comes from `github.sha`; it is not a repository variable to set.
The API image targets `linux/amd64`, matching the standard GitHub runner build
used by the existing VPS deployment. Change the build platform if the target VPS
architecture changes.

Required external Swarm secrets are `bulkbets_db_password`,
`bulkbets_admin_password`, `bulkbets_access_token_secret`,
`bulkbets_refresh_token_secret` and `bulkbets_smtp_password`. Google additionally
requires `bulkbets_google_client_secret`. Keep database, SMTP, Google and signing
credentials in these secrets, rather than in the runner's `.env` or GitHub vars.
Provisioning additionally mounts the selected administrator/provisioner secrets
into its temporary job only, using stable target filenames. The job is removed when
it completes or fails. `DB_HOST` must resolve to that existing PostgreSQL instance.

If provisioning fails with SQLSTATE `28P01`, the selected login/password cannot
authenticate to that instance. PostgreSQL image variables and `_FILE` values apply
only when initializing an empty data directory; updating them does not change a
stored role password. Test credentials over the Swarm hostname, not localhost:
the PostgreSQL container's loopback/socket connections may use `trust` and succeed
even with an incorrect password. Correct the selected provisioning credentials or
use the dedicated login above rather than resetting a shared administrator login.

The workflow uses GitHub's automatic token to push images. Make the GHCR package
public for credential-free future pulls, or configure `GHCR_READ_TOKEN` for a
private package so workers can pull again after the workflow's automatic token
expires. Registry authentication is passed to Swarm for migrations and rollout.
See [GitHub token lifetime](https://docs.github.com/en/actions/concepts/security/github_token)
and [GHCR authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
for the public/private package access rules.

The workflow starts deploying only after these files are committed and pushed to
master and the settings above exist. Before an existing database is upgraded,
use the backup procedure below. Service rollback restores the previous application
image; it does not undo migrations. Vercel's frontend deployment remains managed
by its Git integration.

### 4. Deploy Next.js on Vercel

Import this repository, choose **Root Directory: `web`**, the Next.js preset and
Node.js 24. Set the server-side environment variable `API_URL=https://API_HOST`
with your real API hostname, without `/api/v1`, then deploy. Add the hostname from
`APP_HOST` to the Vercel project and follow Vercel's DNS instructions. Do not point
that frontend DNS record at the VPS. The API DNS record points at the VPS where
Traefik already handles TLS.

`web/vercel.json` pins Next.js functions to London (`lhr1`). A new Vercel
deployment is required for this region setting to take effect. If the API moves,
keep the function region close to it. The homepage loads its market directory
through one `GET /api/v1/shows/directory` request; the original show list and
individual show endpoints remain available to native clients. Browser balance
updates use `GET /api/v1/users/me` through the same-origin rewrite rather than a
Next.js server action.

Deploy the API containing `/api/v1/shows/directory` before the frontend that
uses it. With independent Git integrations, wait for the API release to finish
before promoting the matching Vercel deployment.

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
  --compose-file docker-stack.yaml \
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

The API accepts signed, short-lived visitor IP assertions from the production Vercel proxy. Configure the shared edge secret as described above; without it, web visitors share Vercel egress buckets. Unsigned direct requests use only the dedicated trusted ingress subnet. Client-provided X-Forwarded-For values outside that subnet are ignored. Authenticated action budgets additionally distinguish accounts. A shared two-request hashing budget bounds concurrent password work. Limits are bounded, in process, and reset on restart; use shared storage before scaling beyond one API replica.

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
Set `BULKBETS_TEST_POSTGRES_IMAGE=postgres:17.11-bookworm` to target your VPS database version;
CI uses that version, while local development defaults to Postgres 18.6.
GitHub Actions also runs lint, type checks, Go checks, unit tests and native exports.

References: [Traefik Swarm provider](https://doc.traefik.io/traefik/v3.6/reference/install-configuration/providers/swarm/),
[Docker Swarm secrets](https://docs.docker.com/engine/swarm/secrets/),
[Vercel external rewrites](https://vercel.com/docs/routing/rewrites).
