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

### How to run migrations

1. Using command e.g `./scripts/run.sh migrate-up` / `./scripts/run.sh migrate-down`
2. Using CLI tool [migrate](https://github.com/golang-migrate/migrate?tab=readme-ov-file#cli-usage) e.g `migrate -path=./cmd/migrate/migrations -database=$DB_ADDR up`
