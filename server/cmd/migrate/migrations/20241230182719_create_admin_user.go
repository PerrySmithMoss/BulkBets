package migrations

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upCreateAdminUser, downCreateAdminUser)
}

func upCreateAdminUser(ctx context.Context, tx *sql.Tx) error {
	err := godotenv.Load("../../.env")
	if err != nil {
		log.Fatalf("Error loading .env file in migration")
	}

	adminPassword := os.Getenv("ADMIN_USER_PASSWORD")
	if adminPassword == "" {
		log.Fatal("ADMIN_USER_PASSWORD is not set")
	}

	query := `
		INSERT INTO users (first_name, last_name, email, password_hash)
		    VALUES ($1, $2, $3, $4)`

	adminUser := store.NewUserBuilder().
		SetFirstName("admin").
		SetLastName("user").
		SetEmail("admin@bulkbets.com").
		SetPassword(adminPassword).
		Build()

	_, err = tx.ExecContext(ctx, query, adminUser.FirstName, adminUser.LastName, adminUser.Email, adminUser.Password.GetPasswordHash())
	if err != nil {
		return fmt.Errorf("failed to create admin user: %v", err)
	}
	return nil
}

func downCreateAdminUser(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `
		DELETE FROM users
		WHERE email = 'admin@bulkbets.com'`)
	if err != nil {
		return fmt.Errorf("failed to delete admin user: %v", err)
	}
	return nil
}
