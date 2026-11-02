## Project Architecture Philosophy

### Separation of concerns

Each level in the program should be separated by a clear barrier:

1. Transport layer
2. Service layer
3. Storage layer

### Dependency Inversion Principle (DIP)

We're injecting the dependencies into your layers. We don't directly call them. We're depending on abstractions, not implementations.
Dependencies live on an `interface` and not a `struct`. Structs can implement interfaces, which you can have multiple implementations of an interface which we can inject into our application.
Each layer isn't dependant on another layer, it's a single abstracted unit which can be singularly switched out. This Promotes loose coupling and makes it easier to test.

### Adaptability to change

By organizing our code in a modular and flexible way, it makes it more easy to introduce new features, refactor existing code and evolve to new requirements. System should be easy to change, if you have to change a lot of existing code to add a new feature you're doing it wrong.

## Migrations

### How to run migrations

1. Custom home made Go migration CLI

# Go Migration CLI Documentation

## Overview

The Go Migration CLI tool helps manage database migrations efficiently. It supports common actions such as running migrations, rolling back changes, resetting the database, and checking migration status.

## Prerequisites

- **Go**: Ensure Go is installed on your system.
- **Database**: A PostgreSQL database is required.
- **Environment Variables**: Define the following in a `.env` file:
  - `DB_ADDR`: The connection string for your PostgreSQL database.
  - `ADMIN_USER_PASSWORD`: Password for the admin user (used in migrations).

## Installation

1. Navigate to the project root directory.
2. Build the CLI binary:
   ```bash
   go build -o cmd/migrate/migrator cmd/migrate/*.go
   ```
3. The binary will be created in the `cmd/migrate` directory.

## Usage

In the root of the project navigate to migrator binary e.g (`cd ./cmd/migrate`) and run the binary with the desired action:

```bash
./migrator --action=<action> [--version=<version>]
```

### Actions

- **`up`**: Applies all pending migrations.
- **`down`**: Rolls back the most recent migration.
- **`reset`**: Rolls back all migrations and re-applies them.
- **`status`**: Displays the current migration status.
- **`to`**: Migrates to a specific version.

### Examples

#### Apply All Migrations

```bash
./migrator --action=up
```

#### Roll Back the Last Migration

```bash
./migrator --action=down
```

#### Reset Migrations

```bash
./migrator --action=reset
```

#### Check Migration Status

```bash
./migrator --action=status
```

#### Migrate to a Specific Version

```bash
./migrator --action=to --version=20241231000100
```

## Directory Structure

- **`cmd/migrate/migrations`**: Contains migration files.
- **`cmd/migrate/migrator`**: The built binary for the migration CLI.

## Writing Migrations

Migrations are defined in Go or SQL files inside the `cmd/migrate/migrations` directory. Each migration has an `up` and `down` function for applying and rolling back changes, respectively.

### Adding Migrations

Install the goose package (https://github.com/pressly/goose) and then simply run command `goose create MIGRATION_NAME`, if you want to create an SQL migration file instead of a Go file you can use command `goose create MIGRATION_NAME sql`

## Debugging

- Ensure your `.env` file is correctly set up.
- Check the logs for errors.
- Verify the database connection string (`DB_ADDR`).

## Best Practices

- Always test migrations locally before applying them in production.
- Use version control to track changes to migration files.
- Ensure the `cmd/migrate/migrator` binary is ignored in `.gitignore`:
  ```plaintext
  cmd/migrate/migrator
  ```

## FAQ

### How do I create a new admin user?

Update the `ADMIN_USER_PASSWORD` environment variable and run the `up` action.

---

2. Using MAKE commands inside MakeFile but prefixing the command with the path to run.sh scripts e.g `./scripts/run.sh migrate-up` / `./scripts/run.sh migrate-down` or `./scripts/run.sh goose-up` / `./scripts/run.sh goose-down`. This run.sh script allows us to expose environment variables inside a .env file to the Make command.
3. Using CLI tool [migrate](https://github.com/golang-migrate/migrate?tab=readme-ov-file#cli-usage) e.g `migrate -path=./cmd/migrate/migrations -database=$DB_ADDR up`

---

## Seeds

### How to run migrations

Using MAKE commands inside MakeFile but prefixing the command with the path to run.sh scripts e.g `./scripts/run.sh migrate-up` / `./scripts/run.sh migrate-down` or `./scripts/run.sh goose-up` / `./scripts/run.sh goose-down`. This run.sh script allows us to expose environment variables inside a .env file to the Make command.

## Account creation and recovery

Apply the `20261101190000_account_recovery.sql` migration before using the registration and recovery endpoints. Registration creates a virtual account with a £1,000 balance and requires a date of birth of at least 18 years ago and a password of at least 12 characters.

Password recovery requires `SMTP_ADDR` (host:port), `SMTP_FROM` (an email address), and `APP_CLIENT_URL` (the public web origin). Set `SMTP_USERNAME` and `SMTP_PASSWORD` when the mail server requires authentication. Production SMTP must support STARTTLS. Without mail configuration, the form reports recovery as unavailable.

Reset links expire after 30 minutes and can be used once. Only a token digest is stored. A completed reset revokes existing refresh tokens; existing access tokens remain valid until their configured expiry. The isolated E2E stack disables outbound email and uses database reset fixtures; in-process SMTP tests check message delivery without an external service.

### Resend delivery

The existing SMTP client supports Resend without an SDK. Sign into the Resend
account for `bulkbetshq@gmail.com`, verify a sending domain using the DNS records
provided by Resend, and use an API key with sending access. The account's Gmail
address is the login; `SMTP_FROM` must use your verified sending domain.

BulkBets uses `bulkbets.perrysmithmoss.com` as its sending domain and
`noreply@bulkbets.perrysmithmoss.com` as its sender. The parent domain is registered
at Namecheap, but its authoritative nameservers are Vercel's, so manage the Resend
verification records in Vercel DNS. Domain verification must complete before live
email delivery can work.

The domain was verified on 2026-11-02. A live password-recovery check through the
local web API proxy reached Resend and was marked Delivered to a dedicated Gmail
test alias. The delivered token reset that test account successfully; login with
the new password succeeded, the old password was rejected, and token reuse was
rejected. Local credentials are stored only in the ignored root and server `.env`
files; a deployment still needs its own environment configuration.

For local Docker Compose, put the following in the repository-root `.env`
(ignored by Git). For production, use the Vercel + Swarm instructions in
`deploy/README.md`. Store the sending key in the `bulkbets_smtp_password` Docker
secret and include `deploy/docker-stack.smtp.yml` when deploying.

```dotenv
SMTP_ADDR=smtp.resend.com:587
SMTP_FROM=noreply@bulkbets.perrysmithmoss.com
SMTP_USERNAME=resend
SMTP_PASSWORD=<Resend API key>
```

Restart/recreate the API after changing these variables. If running Go directly,
load them into the process environment instead. Use port 587 for STARTTLS;
the client does not implement implicit TLS on port 465.

For a live delivery check, request a password reset for an existing password-based
test account whose inbox you control. Check delivery in Resend and the recipient
inbox, then open the link and complete the reset using that test account. Keep
automated E2E tests on isolated reset fixtures so they do not send real email or
consume Resend's quota. Provider setup is documented at <https://resend.com/docs/send-with-smtp>.


## Portfolio wallet and settlement

Apply `20261102120000_portfolio_wallet.sql` before starting the updated API. All
customer and guest funds are virtual. The bootstrap admin remains an ordinary
protected account; customer registration and OAuth onboarding enable the demo.
`GET /api/v1/wallet` returns up to 100 receipts. `POST /api/v1/wallet/transfer`
accepts `{amount, kind, request_key}` where kind is `DEMO_DEPOSIT` or
`DEMO_WITHDRAWAL`, and request_key is a UUID unique to the attempted transfer.
A retried key returns its original receipt; changing its payload returns 409.
Transfers are £0.01–£10,000, with a £1,000,000 deposit balance ceiling.

The `/api/v1/sandbox/shows` endpoints manage only the caller's private events.
`POST /sandbox/shows/{id}/preview` and `/run` accept a mode of `favourite`,
`upset`, or `void`. Selected winners override price-based winners. The worker
resumes due events from Postgres after a restart. Historical replay settlement
excludes these private events. Publication of ordinary-account results and
settlement is atomic, and paid bets cannot be selected a second time.

See `deploy/README.md` from the repository root for hosting, retention and
operational details. `BULKBETS_TEST_DSN` enables the storage integration tests
against a disposable migrated database; never point it at development or live data.


Production supports Docker secret files through `DB_PASSWORD_FILE`,
`ACCESS_TOKEN_SECRET_FILE`, `REFRESH_TOKEN_SECRET_FILE`, `SMTP_PASSWORD_FILE`
and `GOOGLE_CLIENT_SECRET_FILE`. Migrations also accept `ADMIN_USER_PASSWORD_FILE`.
A key cannot be configured through both its value and its `_FILE` setting.
Migration jobs can use `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`,
`DB_PASSWORD_FILE` and `DB_SSL_ENABLED` instead of a password-bearing `DB_ADDR`.
The VPS stack reuses the existing PostgreSQL 17 service and `portfolio_network`;
it does not create or alter the infrastructure stack. Give BulkBets a dedicated
login/database rather than mounting the infrastructure admin credentials in the API.
