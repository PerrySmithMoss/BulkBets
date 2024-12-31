package migrationService

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
)

type MigrationService struct {
	db *sql.DB
}

func NewMigrationService(dbURL string) (*MigrationService, error) {
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}

	// Set migrations directory
	goose.SetBaseFS(nil)
	if err := goose.SetDialect("postgres"); err != nil {
		return nil, fmt.Errorf("failed to set dialect: %v", err)
	}

	return &MigrationService{db: db}, nil
}

// acquireLock tries to acquire a migration lock with a timeout
func (ms *MigrationService) acquireLock(ctx context.Context) error {
	// Create lock table if it doesn't exist
	_, err := ms.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS migration_locks (
			id INTEGER PRIMARY KEY,
			is_locked BOOLEAN,
			locked_at TIMESTAMP,
			locked_by TEXT
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create lock table: %v", err)
	}

	// Try to acquire lock
	result, err := ms.db.ExecContext(ctx, `
		INSERT INTO migration_locks (id, is_locked, locked_at, locked_by)
		VALUES (1, true, $1, $2)
		ON CONFLICT (id) DO UPDATE
		SET is_locked = true, locked_at = $1, locked_by = $2
		WHERE migration_locks.is_locked = false
		OR migration_locks.locked_at < $3
	`,
		time.Now(),
		"migration-service",
		time.Now().Add(-5*time.Minute), // Consider locks older than 5 minutes as stale
	)
	if err != nil {
		return fmt.Errorf("failed to acquire lock: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check lock status: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("migration is already in progress")
	}

	return nil
}

// releaseLock releases the migration lock
func (ms *MigrationService) releaseLock(ctx context.Context) error {
	_, err := ms.db.ExecContext(ctx, `
		UPDATE migration_locks
		SET is_locked = false, locked_at = NULL, locked_by = NULL
		WHERE id = 1 AND locked_by = 'migration-service'
	`)
	return err
}

// executeWithLock runs a migration operation with locking
func (ms *MigrationService) executeWithLock(ctx context.Context, operation func() error) error {
	if err := ms.acquireLock(ctx); err != nil {
		return fmt.Errorf("failed to acquire lock: %v", err)
	}

	defer func() {
		if err := ms.releaseLock(ctx); err != nil {
			log.Printf("failed to release migration lock: %v", err)
		}
	}()

	return operation()
}

func (ms *MigrationService) MigrateUp(ctx context.Context) error {
	return ms.executeWithLock(ctx, func() error {
		if err := goose.Up(ms.db, "./migrations"); err != nil {
			return fmt.Errorf("failed to run migrations: %v", err)
		}
		return nil
	})
}

func (ms *MigrationService) MigrateDown(ctx context.Context) error {
	return ms.executeWithLock(ctx, func() error {
		if err := goose.Down(ms.db, "./migrations"); err != nil {
			return fmt.Errorf("failed to rollback migrations: %v", err)
		}
		return nil
	})
}

func (ms *MigrationService) MigrateTo(ctx context.Context, version int64) error {
	return ms.executeWithLock(ctx, func() error {
		if err := goose.UpTo(ms.db, "./migrations", version); err != nil {
			return fmt.Errorf("failed to migrate to version %d: %v", version, err)
		}
		return nil
	})
}

func (ms *MigrationService) Status(ctx context.Context) error {
	// Status doesn't modify anything, so we don't need a lock
	if err := goose.Status(ms.db, "./migrations"); err != nil {
		return fmt.Errorf("failed to get migration status: %v", err)
	}
	return nil
}

func (ms *MigrationService) Reset(ctx context.Context) error {
	return ms.executeWithLock(ctx, func() error {
		if err := goose.Reset(ms.db, "./migrations"); err != nil {
			return fmt.Errorf("failed to reset migrations: %v", err)
		}
		return nil
	})
}

func (ms *MigrationService) Close() error {
	return ms.db.Close()
}
