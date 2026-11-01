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
docker compose up --build --wait
docker compose run --rm migrate /app/migrate -action seed
npm --prefix web run dev
```

Open <http://localhost:3000>. The API is at <http://localhost:8080/api/v1/health>.
Postgres is exposed on localhost port 55432 (`DB_PORT` can override it).
The migrations create `admin@bulkbets.com` with password `local-development-password`
(or `ADMIN_USER_PASSWORD` supplied to Docker Compose). Its balance starts at zero.
Seeds contain demo shows, competitors, and odds. The seed command tracks its own
version table, so running it again does not duplicate data.

Compose defaults are for local development. Supply your own secrets and credentials
for a deployment. OAuth is optional; password login works without provider credentials.
Account registration, password login and recovery are available. Recovery needs the
SMTP configuration in `server/.env.example`. Deposits and withdrawals are unavailable.

## Portfolio demo

The web homepage is a sportsbook workspace: show and division navigation, selectable
odds, a persistent desktop slip and a mobile slip tray. **Try demo** starts a unique
visitor session with £1,000 in virtual funds, without registration. Sessions use the
existing access/refresh cookies and persist bets and balances in Postgres.

Historical shows remain playable for demo users. **Simulate results** settles only
that visitor’s pending bets; the lowest-priced eligible athlete in each division
wins (UUID order breaks ties). Returns include the original stake. Simulation is
idempotent, and both singles and accumulators are supported. **Reset my demo** clears
only the current demo’s bets/transactions and restores £1,000. Event dates and shared
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

The mobile app currently displays demo events and placeholder Search, In-Play, and
My Bets screens; it does not connect to the Go API. Its login and event buttons
display placeholder alerts. Native execution requires Xcode and an iOS simulator,
or Android Studio / an Android emulator, or a development build on a physical device.
After this SDK upgrade, rebuild any previously installed development client.

Stop the development API/database with `docker compose down`. Its Postgres 18 data
persists in `db-data-v18`. An existing Postgres 16 volume, if present, is left intact;
migrating real data between database major versions requires a dump/restore.

## Verification

```sh
npm --prefix web run lint
npm --prefix web run typecheck
npm --prefix web test -- --runInBand
npm --prefix mobile run lint
npm --prefix mobile run typecheck
cd mobile && npx expo-doctor && npm run export:native && cd ..
```

With a local Go 1.27.3 installation, run `go test ./...` and `go vet ./...` in `server`.
The Go checks run the API tests and compile every package.

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
and Expo's implemented navigation and placeholder interactions. Screenshots and failure
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
