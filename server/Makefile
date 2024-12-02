include .env
MIGRATIONS_PATH = ./cmd/migrate/migrations
SEEDS_PATH = ./cmd/migrate/seeds

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
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(MIGRATIONS_PATH) create $(filter-out $@,$(MAKECMDGOALS))

# ! Used for seeds
# .PHONY: goose-create
# goose-create:
# 	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(SEEDS_PATH) create $(filter-out $@,$(MAKECMDGOALS))

# ! Used for migrations
# .PHONY: goose-up
# goose-up:
# 	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(MIGRATIONS_PATH) up

# ! Used for seeds
.PHONY: goose-up
goose-up:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(SEEDS_PATH) -no-versioning up

# ! Used for migrations
.PHONY: goose-down
goose-down:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(MIGRATIONS_PATH) down

# ! Used for seeds
# .PHONY: goose-down
# goose-down:
# 	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(SEEDS_PATH) -no-versioning down

.PHONY: goose-reset
goose-reset:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(MIGRATIONS_PATH) reset

# Goose seeds
.PHONY: seed-create
seed-create:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(SEEDS_PATH) create $(filter-out $@,$(MAKECMDGOALS))

.PHONY: seed-up
seed-up:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(SEEDS_PATH) up -no-versioning

.PHONY: seed-down
seed-down:
	@GOOSE_DRIVER=$(DB_DRIVER) GOOSE_DBSTRING=$(DB_ADDR) goose -dir $(SEEDS_PATH) down -no-versioning

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
