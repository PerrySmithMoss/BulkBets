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

### How to create a migration

- Using goose e.g `./scripts/run.sh goose-create create_shows_table sql` or `./scripts/run.sh goose-create create_shows_table go` if you would like to write your migration using go
- Using migrate package e.g `./scripts/run.sh migrate-create create_shows_table`

### How to run migrations

1. Using MAKE commands inside MakeFile but prefixing the command with the path to run.sh scripts e.g `./scripts/run.sh migrate-up` / `./scripts/run.sh migrate-down` or `./scripts/run.sh goose-up` / `./scripts/run.sh goose-down`. This run.sh script allows us to expose environment variables inside a .env file to the Make command.
2. Using CLI tool [migrate](https://github.com/golang-migrate/migrate?tab=readme-ov-file#cli-usage) e.g `migrate -path=./cmd/migrate/migrations -database=$DB_ADDR up`
