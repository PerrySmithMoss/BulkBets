# BulkBets

Next.js web app (`web`), Expo / React Native app (`mobile`), and a Go API (`server`).

## Fresh clone setup

Install Node.js 24 (see `.node-version`) and Docker Desktop, and start Docker.
Go is provided by the API's Docker build; a local Go installation is optional.

From the repository root:

```sh
npm --prefix web ci
npm --prefix mobile ci
cp -n web/.env.example web/.env
cp -n server/.env.example server/.env
docker compose up --build --wait
docker compose run --rm migrate /app/migrate -action seed
npm --prefix web run dev
```

Open <http://localhost:3000>. The API is at <http://localhost:8080/api/v1/health>.
Postgres is exposed on localhost port 55432 (a shell `DB_PORT` can override it).
Registered customer accounts start with £1,000 in virtual funds. The migrations create `admin@bulkbets.com` with password `local-development-password`
(or `ADMIN_USER_PASSWORD` set in `server/.env`). Its balance starts at zero.
Seeds contain demo shows, competitors, and odds. The seed command tracks its own
version table, so running it again does not duplicate data.

Compose defaults are for local development. Supply your own secrets and credentials
for a deployment. OAuth is optional; password login works without provider credentials.
Account registration, password login and recovery are available. Recovery needs the
SMTP configuration in `server/.env.example` for external mail. For local Resend delivery,
set `SMTP_ADDR`, `SMTP_FROM`, `SMTP_USERNAME` and `SMTP_PASSWORD` in the ignored
`server/.env`. Compose loads the server environment directly, with Docker database
addresses overriding the localhost settings used when running Go on the host.
Recovery is unavailable until SMTP is configured. The demo wallet supports simulated deposits and withdrawals. No real money is used.

## Portfolio demo

The web homepage is a sportsbook workspace: show and division navigation, selectable
odds, a persistent desktop slip and a mobile slip tray. **Try demo** starts a unique
visitor session with £1,000 in virtual funds, without registration. Sessions use the
existing access/refresh cookies and persist bets and balances in Postgres.

Historical shows remain playable for demo users. **Simulate results** settles only
that account’s historical replay bets using a choice of favourites, outsiders or
cancellation/refund scenarios (UUID order breaks price ties). Returns include the original stake. Simulation is
idempotent, and both singles and accumulators are supported. **Reset my demo** clears
only the current account’s bets, wallet receipts and private events, and restores £1,000. Event dates and shared
results are never advanced or overwritten by playing the demo. Ordinary accounts
retain the existing market closing checks.

Existing installations must apply the new migrations before starting the updated API:

```sh
docker compose build
docker compose run --rm migrate /app/migrate -action up
docker compose up -d api
```

The homepage uses the matching 2024 Olympia poster already in the repository. The
2024 Arnold Europe and 2025 Arnold posters are deliberately not paired with the
Columbus 2024 market. Olympia fixture dates now match the official 10–13 October
weekend; division times, line-ups and odds remain illustrative sample data.

Start the mobile app in a separate terminal:

```sh
npm --prefix mobile start
# Or use the browser target:
npm --prefix mobile run web
```

The mobile app connects to the Go API for guest sessions, registration/login,
searchable markets, singles/accumulators, wallet transfers, receipts, bet history,
simulated results and private events with automatic settlement. Expo web uses the
local API during development and a same-origin `/api` proxy after export. Set
`EXPO_PUBLIC_API_URL` for a physical device or a different API origin. Native execution requires Xcode and an iOS simulator,
or Android Studio / an Android emulator, or a development build on a physical device.
After this SDK upgrade, rebuild any previously installed development client.

Stop the development API/database with `docker compose down`. Its Postgres 18 data
persists in `db-data-v18`. An existing Postgres 16 volume, if present, is left intact;
migrating real data between database major versions requires a dump/restore.

## Wallet, event studio and hosting

Open **Wallet** to simulate deposits and withdrawals with persistent receipts.
Open **Event studio** to create private shows, manage divisions/athletes/prices,
suspend markets, choose winners and preview payouts. **Run event** closes betting
and automatically settles it after five seconds. Shared historical data and other
visitors are unaffected. Completed private events cannot restart.

See [the deployment guide](deploy/README.md) for the Vercel frontend and Traefik/Swarm backend,
SMTP, backups, monitoring, guest retention, mobile configuration and verification.
The project has no real-money payment or redemption path.

[The GitHub Actions pipeline](.github/workflows/pipeline.yaml) validates changes,
publishes the API image and deploys every validated push to `master` to the existing
VPS Swarm. A temporary job creates the dedicated database/role if missing before
running migrations and seeds. Configure the repository secrets/variables listed in the deployment
guide before enabling the first rollout. Frontend hosting remains on Vercel.

## Language and tooling conventions

Use TypeScript for web/mobile code, custom Node scripts and test fixtures. Keep
the backend in Go. Tool-owned configuration can use JavaScript where that avoids
extra loaders; GitHub workflows and small deployment wrappers retain their native
YAML/shell formats. Do not introduce additional language runtimes for utilities.

Standalone Node tooling uses `.mts` for explicit ES modules and runs directly on
our pinned Node 24. Native execution strips types but does not check them; CI also
runs the strict `tsconfig.tools.json` check. Use erasable TypeScript syntax, explicit
type imports and runtime validation at JSON/environment boundaries.

`deploy/tsconfig.json` extends the same tooling configuration so editors discover
the deployment tests and their Node types automatically. VS Code is configured to
offer the workspace TypeScript version installed by `npm --prefix web ci`.

## Verification

```sh
npm --prefix web run lint
npm --prefix web run typecheck
npm --prefix web run typecheck:tools
node --test deploy/tests/rollout.test.mts
npm --prefix web test
npm --prefix mobile run lint
npm --prefix mobile run typecheck
cd mobile && npx expo-doctor && npm run export:native && cd ..
```

With a local Go 1.27.3 installation, run `go test ./...` and `go vet ./...` in `server`.
The Go checks run API/security tests and compile every package. Storage integration
tests run against the isolated database in the browser suite.

Run the complete browser suite from a fresh clone after installing both apps:

```sh
cd web
npx playwright install chromium
npm run test:e2e
```

The runner creates an isolated `bulkbets-e2e` Docker Compose project, migrates and
seeds an ephemeral Postgres database, gives its test account a simulated balance,
builds/starts the production Next.js app and Expo web export, and runs Playwright.
It removes the test containers afterward, including when tests fail. It does not
read or delete the development database. Ports 3100, 3101, and 18080 must be free.
No external accounts, env files, or OAuth secrets are needed for these tests.

The suite covers real API/database integration: market navigation, search, registration,
password recovery, login/logout, refresh-token rotation, isolated demo sessions,
historical betting, singles/accumulators, payout settlement, reset, saved-slip reload,
insufficient funds, API validation, phone layouts,
and Expo's connected betting, wallet, results and private-event journeys. Screenshots and failure
traces are saved in `web/test-results`; open the report with `npx playwright show-report`.
Browser tests of Expo web and native bundle exports do not establish native device E2E.

## Dependency upgrade notes (2026-11-01)

- Next.js 16.4, React 19.3, Tailwind CSS 4.3, Jest 30, Expo SDK 58, React Native 0.88,
  Go 1.27.3, and Postgres 18.6. Manifests and lockfiles include updated direct and
  transitive dependencies.
- Expo-managed libraries use SDK 58's supported versions, including React 19.3.0,
  Worklets 0.13.0, and Safe Area Context 5.10.x. Independent upgrades of these packages
  can break native compatibility; use `npx expo install --check` in `mobile`.
- ESLint stays on the newest compatible 9.x because the React ESLint plugin's peer
  range excludes 10. TypeScript stays on 6.0 because the TypeScript ESLint parser's
  peer range excludes 7.
- `npm audit --omit=dev` is clean for the web app. Latest Expo SDK tooling still
  includes moderate `glob` / `minimatch` advisories. Full development-tool audits also
  flag transitive packages in ESLint/Jest. Avoid `npm audit fix --force`: its proposed
  downgrades break the current frameworks. Recheck upstream releases before deploying.

Migration references: [Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16),
[Tailwind CSS 4](https://tailwindcss.com/docs/upgrade-guide),
[Expo SDK 58](https://expo.dev/blog/how-to-upgrade-to-sdk-58).
