// Package provision creates the application's database and login before migrations.
// It runs only in a temporary deployment job with PostgreSQL administrator access.
package provision

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/lib/pq"
	"github.com/xdg-go/scram"
)

type Settings struct {
	AdminURL string
	AppURL   string
	User     string
	Database string
	Password string
}

type Result struct {
	RoleCreated     bool
	DatabaseCreated bool
}

func (s Settings) Validate() error {
	for _, name := range []string{s.User, s.Database} {
		if name == "" || len(name) > 63 || !utf8.ValidString(name) || strings.ContainsRune(name, 0) {
			return errors.New("DB_USER and DB_NAME must be valid PostgreSQL identifiers of 1–63 bytes")
		}
		if strings.HasPrefix(name, "pg_") || name == "postgres" || name == "template0" || name == "template1" {
			return errors.New("use a dedicated application role and database, not PostgreSQL system names")
		}
	}
	if len(s.Password) < 16 || strings.ContainsRune(s.Password, 0) {
		return errors.New("DB_PASSWORD must contain at least 16 bytes and no null characters")
	}
	if s.AdminURL == "" || s.AppURL == "" {
		return errors.New("administrator and application connection settings are required")
	}
	return nil
}

// operationError deliberately excludes driver messages, which may contain SQL,
// connection strings, or credentials. SQLSTATE is safe and useful for diagnosis.
func operationError(operation string, err error) error {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return fmt.Errorf("%s: %w", operation, err)
	}
	var pgErr *pq.Error
	if errors.As(err, &pgErr) {
		return fmt.Errorf("%s failed (PostgreSQL SQLSTATE %s)", operation, pgErr.Code)
	}
	return fmt.Errorf("%s failed; check database connectivity and secret configuration", operation)
}

func passwordVerifier(password string) (string, error) {
	client, err := scram.SHA256.NewClient("", password, "")
	if err != nil {
		return "", errors.New("database password cannot be prepared for SCRAM authentication")
	}
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", errors.New("generate database password salt")
	}
	const iterations = 4096
	credentials, err := client.GetStoredCredentialsWithError(scram.KeyFactors{Salt: string(salt), Iters: iterations})
	if err != nil {
		return "", errors.New("derive database password verifier")
	}
	encode := base64.StdEncoding.EncodeToString
	return fmt.Sprintf("SCRAM-SHA-256$%d:%s$%s:%s", iterations, encode(salt), encode(credentials.StoredKey), encode(credentials.ServerKey)), nil
}

// Ensure leaves existing credentials, ownership, privileges and data unchanged.
// Incompatible existing objects fail deployment rather than being taken over.
func Ensure(ctx context.Context, s Settings) (Result, error) {
	var result Result
	if err := s.Validate(); err != nil {
		return result, err
	}
	db, err := sql.Open("postgres", s.AdminURL)
	if err != nil {
		return result, operationError("configure provisioning connection", err)
	}
	defer db.Close()
	conn, err := db.Conn(ctx)
	if err != nil {
		return result, operationError("connect as provisioning administrator", err)
	}
	defer conn.Close()
	// Keep a single session across the existence checks and CREATE statements.
	// CREATE DATABASE cannot run inside a transaction. A session lock also
	// serializes provisioning jobs started outside GitHub's concurrency group.
	const lockID int64 = 804451263122
	if _, err := conn.ExecContext(ctx, `SELECT pg_advisory_lock($1)`, lockID); err != nil {
		return result, operationError("lock database provisioning", err)
	}
	defer func() {
		unlockCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, _ = conn.ExecContext(unlockCtx, `SELECT pg_advisory_unlock($1)`, lockID)
	}()

	var owner string
	var template, allowConnections bool
	err = conn.QueryRowContext(ctx, `SELECT pg_get_userbyid(datdba), datistemplate, datallowconn FROM pg_database WHERE datname=$1`, s.Database).Scan(&owner, &template, &allowConnections)
	databaseExists := err == nil
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return result, operationError("inspect application database", err)
	}
	if databaseExists && (owner != s.User || template || !allowConnections) {
		return result, errors.New("existing database must be a connectable, non-template database owned by DB_USER; no ownership changes were made")
	}

	var login, superuser, createDB, createRole, replication, bypassRLS, memberships bool
	err = conn.QueryRowContext(ctx, `SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
		EXISTS (SELECT 1 FROM pg_auth_members WHERE member=pg_roles.oid)
		FROM pg_roles WHERE rolname=$1`, s.User).Scan(&login, &superuser, &createDB, &createRole, &replication, &bypassRLS, &memberships)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		verifier, err := passwordVerifier(s.Password)
		if err != nil {
			return result, err
		}
		// Identifiers are quoted separately; only a SCRAM verifier enters SQL,
		// so a plaintext password cannot leak through statement logging.
		_, err = conn.ExecContext(ctx, `CREATE ROLE `+pq.QuoteIdentifier(s.User)+` LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD `+pq.QuoteLiteral(verifier))
		if err != nil {
			return result, operationError("create application role", err)
		}
		result.RoleCreated = true
	case err != nil:
		return result, operationError("inspect application role", err)
	case !login || superuser || createDB || createRole || replication || bypassRLS || memberships:
		return result, errors.New("existing application role must have LOGIN without elevated privileges or role memberships; no privileges were changed")
	}
	if !databaseExists {
		if _, err := conn.ExecContext(ctx, `CREATE DATABASE `+pq.QuoteIdentifier(s.Database)+` OWNER `+pq.QuoteIdentifier(s.User)); err != nil {
			return result, operationError("create application database", err)
		}
		result.DatabaseCreated = true
	}

	app, err := sql.Open("postgres", s.AppURL)
	if err != nil {
		return result, operationError("configure application connection", err)
	}
	defer app.Close()
	if err := app.PingContext(ctx); err != nil {
		return result, operationError("verify application login (existing passwords are never reset)", err)
	}
	return result, nil
}
