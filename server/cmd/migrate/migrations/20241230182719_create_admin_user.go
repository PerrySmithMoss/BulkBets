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
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("loading .env file: %w", err)
	}

	adminPassword := os.Getenv("ADMIN_USER_PASSWORD")
	if adminPassword == "" {
		log.Fatal("ADMIN_USER_PASSWORD is not set")
	}

	// Create admin user
	createUserQuery := `
		INSERT INTO users (first_name, last_name, email, password_hash)
		VALUES ($1, $2, $3, $4)`

	adminUser := store.NewUserBuilder().
		SetFirstName("admin").
		SetLastName("user").
		SetEmail("admin@bulkbets.com").
		SetPassword(adminPassword).
		Build()

	_, err = tx.ExecContext(ctx, createUserQuery,
		adminUser.FirstName,
		adminUser.LastName,
		adminUser.Email,
		adminUser.Password.GetPasswordHash(),
	)
	if err != nil {
		return fmt.Errorf("failed to create admin user: %v", err)
	}

	// Assign admin role to the admin user
	assignRoleQuery := `
		INSERT INTO user_roles (user_id, role_id)
		SELECT u.id, r.id
		FROM users u, roles r
		WHERE u.email = 'admin@bulkbets.com'
		AND r.name = 'admin'`

	_, err = tx.ExecContext(ctx, assignRoleQuery)
	if err != nil {
		return fmt.Errorf("failed to assign admin role to admin user: %v", err)
	}

	return nil
}

func downCreateAdminUser(ctx context.Context, tx *sql.Tx) error {
	// Remove role assignment first due to foreign key constraints
	removeRoleQuery := `
		DELETE FROM user_roles
		WHERE user_id IN (
			SELECT id FROM users WHERE email = 'admin@bulkbets.com'
		)`

	_, err := tx.ExecContext(ctx, removeRoleQuery)
	if err != nil {
		return fmt.Errorf("failed to remove admin role from admin user: %v", err)
	}

	// Then remove the user
	removeUserQuery := `
		DELETE FROM users
		WHERE email = 'admin@bulkbets.com'`

	_, err = tx.ExecContext(ctx, removeUserQuery)
	if err != nil {
		return fmt.Errorf("failed to delete admin user: %v", err)
	}

	return nil
}
