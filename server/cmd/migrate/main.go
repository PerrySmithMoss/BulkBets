package main

import (
	"context"
	"flag"
	"log"
	"os"
	"time"

	"database/sql"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"

	_ "github.com/PerrySmithMoss/BulkBets/server/cmd/migrate/migrations"
	"github.com/PerrySmithMoss/BulkBets/server/config"
	"github.com/PerrySmithMoss/BulkBets/server/internal/env"
	migrationService "github.com/PerrySmithMoss/BulkBets/server/internal/migrations"
	"github.com/PerrySmithMoss/BulkBets/server/internal/provision"
)

func main() {
	action := flag.String("action", "up", "Database action (provision, up, down, reset, status, to, seed)")
	version := flag.Int64("version", 0, "Version to migrate to (only for 'to' action)")
	flag.Parse()

	if *action == "provision" {
		if err := env.LoadSecretFiles("DB_PASSWORD", "DB_ADMIN_USER", "DB_ADMIN_PASSWORD"); err != nil {
			log.Fatal(err)
		}
		if os.Getenv("DB_HOST") == "" || os.Getenv("DB_ADMIN_USER") == "" || os.Getenv("DB_ADMIN_PASSWORD") == "" {
			log.Fatal("Provisioning requires DB_HOST and DB_ADMIN_USER/DB_ADMIN_PASSWORD(_FILE)")
		}
		cfg := config.GetConfig().DB
		admin := cfg
		admin.DBUser = os.Getenv("DB_ADMIN_USER")
		admin.DBPassword = os.Getenv("DB_ADMIN_PASSWORD")
		admin.DBName = env.GetEnv("DB_ADMIN_NAME", "postgres")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		result, err := provision.Ensure(ctx, provision.Settings{
			AdminURL: admin.ConnectionString(), AppURL: cfg.ConnectionString(),
			User: cfg.DBUser, Database: cfg.DBName, Password: cfg.DBPassword,
		})
		if err != nil {
			log.Fatal(err)
		}
		log.Printf("Database provisioned and login verified (role_created=%t database_created=%t)", result.RoleCreated, result.DatabaseCreated)
		return
	}
	// Explicit connection settings take precedence over local dotenv files.
	if os.Getenv("DB_ADDR") == "" && os.Getenv("DB_HOST") == "" {
		if err := godotenv.Load("../../.env"); err != nil && !os.IsNotExist(err) {
			log.Fatalf("Error loading .env file: %v", err)
		}
	}
	if err := env.LoadSecretFiles("DB_PASSWORD", "ADMIN_USER_PASSWORD"); err != nil {
		log.Fatal(err)
	}
	dbURL := os.Getenv("DB_ADDR")
	if dbURL == "" {
		if os.Getenv("DB_HOST") == "" {
			log.Fatal("Set DB_ADDR or DB_HOST with DB_USER, DB_NAME and DB_PASSWORD(_FILE)")
		}
		dbURL = config.GetConfig().DB.ConnectionString()
	}

	migrationService, err := migrationService.NewMigrationService(dbURL)
	if err != nil {
		log.Fatalf("Failed to initialize migration service: %v", err)
	}
	defer migrationService.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	switch *action {
	case "seed":
		var seedDB *sql.DB
		seedDB, err = sql.Open("postgres", dbURL)
		if err == nil {
			defer seedDB.Close()
			var provider *goose.Provider
			provider, err = goose.NewProvider(goose.DialectPostgres, seedDB, os.DirFS("./seeds"),
				goose.WithDisableGlobalRegistry(true), goose.WithTableName("goose_seed_version"))
			if err == nil {
				_, err = provider.Up(ctx)
			}
		}
	case "up":
		err = migrationService.MigrateUp(ctx)
	case "down":
		err = migrationService.MigrateDown(ctx)
	case "reset":
		err = migrationService.Reset(ctx)
	case "status":
		err = migrationService.Status(ctx)
	case "to":
		if *version == 0 {
			log.Fatal("You must specify a version with --version for the 'to' action")
		}
		err = migrationService.MigrateTo(ctx, *version)
	default:
		log.Fatalf("Unknown action: %s", *action)
	}

	if err != nil {
		log.Fatalf("Migration action failed: %v", err)
	}

	log.Printf("Migration action '%s' completed successfully", *action)
}
