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
