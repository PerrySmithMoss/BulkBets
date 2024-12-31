package main

import (
	"context"
	"flag"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	_ "github.com/PerrySmithMoss/BulkBets/server/cmd/migrate/migrations"
	migrationService "github.com/PerrySmithMoss/BulkBets/server/internal/migrations"
)

func main() {
	err := godotenv.Load("../../.env")
	if err != nil {
		log.Fatalf("Error loading .env file")
	}

	dbURL := os.Getenv("DB_ADDR")
	if dbURL == "" {
		log.Fatal("DB_ADDR is not set")
	}

	action := flag.String("action", "up", "Migration action (up, down, reset, status, to)")
	version := flag.Int64("version", 0, "Version to migrate to (only for 'to' action)")
	flag.Parse()

	migrationService, err := migrationService.NewMigrationService(dbURL)
	if err != nil {
		log.Fatalf("Failed to initialize migration service: %v", err)
	}
	defer migrationService.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	switch *action {
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
