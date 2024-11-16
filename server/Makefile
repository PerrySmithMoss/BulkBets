include .env
MIGRATIONS_PATH = ./cmd/migrate/migrations

.PHONY: test
test:
	@go test -v ./...

# Goose migrations
.PHONY: goose-status
goose-status:
	@echo "Running goose status with database: $(DB_ADDR)"
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(MIGRATIONS_PATH) status

.PHONY: goose-create
goose-create:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(MIGRATIONS_PATH) $(filter-out goose,$(MAKECMDGOALS))

.PHONY: goose-up
goose-up:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(MIGRATIONS_PATH) up

.PHONY: goose-down
goose-down:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(MIGRATIONS_PATH) down

.PHONY: goose-reset
goose-reset:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(MIGRATIONS_PATH) reset

# Migrate package migrations
.PHONY: migrate-create
migration:
	@migrate create -seq -ext sql -dir $(MIGRATIONS_PATH) $(filter-out $@,$(MAKECMDGOALS))

.PHONY: migrate-up
migrate-up:
	@migrate -path=$(MIGRATIONS_PATH) -database=$(DB_ADDR) up

.PHONY: migrate-down
migrate-down:
	@migrate -path=$(MIGRATIONS_PATH) -database=$(DB_ADDR) down $(filter-out $@,$(MAKECMDGOALS))

# Custom seed script

.PHONY: seed
seed: 
	@go run cmd/migrate/seed/main.go
