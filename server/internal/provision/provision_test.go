package provision

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/lib/pq"
)

func TestOperationErrorsDoNotExposeCredentials(t *testing.T) {
	for _, cause := range []error{
		errors.New("postgres://secret-user:secret-password@host/database"),
		&pq.Error{Code: "42501", Message: "SQL containing secret-password", Detail: "secret-password"},
	} {
		err := operationError("provision database", cause)
		if strings.Contains(err.Error(), "secret-") {
			t.Fatalf("error exposed credentials: %v", err)
		}
	}
}

func TestInvalidSettingsAreRejectedBeforeConnecting(t *testing.T) {
	for _, name := range []string{"", "postgres", "template0", "pg_reserved", strings.Repeat("a", 64), "null\x00name"} {
		_, err := Ensure(context.Background(), Settings{
			AdminURL: "must-not-connect", AppURL: "must-not-connect",
			User: name, Database: "bulk_bets", Password: "test-password-at-least-16",
		})
		if err == nil || strings.Contains(err.Error(), "connectivity") {
			t.Fatalf("invalid identifier was not rejected before connecting: %q", name)
		}
	}
}

// This DSN must point to an isolated test server: tests create/drop their own
// uniquely named roles and databases. CI supplies a separate disposable Postgres.
func integrationSettings(t *testing.T) (*Settings, *sql.DB) {
	t.Helper()
	dsn := os.Getenv("BULKBETS_PROVISION_TEST_DSN")
	if dsn == "" {
		t.Skip("set BULKBETS_PROVISION_TEST_DSN to an isolated PostgreSQL administrator DSN")
	}
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatal("test DSN must be a PostgreSQL URL")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	name := fmt.Sprintf("bb_provision_%d", time.Now().UnixNano())
	s := &Settings{AdminURL: dsn, User: name, Database: name, Password: "test 'quoted; password\\é1234"}
	appURL := *u
	appURL.User = url.UserPassword(s.User, s.Password)
	appURL.Path = "/" + s.Database
	s.AppURL = appURL.String()
	t.Cleanup(func() {
		if _, err := db.Exec(`DROP DATABASE IF EXISTS ` + pq.QuoteIdentifier(s.Database) + ` WITH (FORCE)`); err != nil {
			t.Error(err)
		}
		if _, err := db.Exec(`DROP ROLE IF EXISTS ` + pq.QuoteIdentifier(s.User)); err != nil {
			t.Error(err)
		}
		db.Close()
	})
	return s, db
}

func ensure(t *testing.T, s Settings) Result {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	result, err := Ensure(ctx, s)
	if err != nil {
		t.Fatal(err)
	}
	return result
}

func verifier(t *testing.T, db *sql.DB, user string) string {
	t.Helper()
	var value string
	if err := db.QueryRow(`SELECT rolpassword FROM pg_authid WHERE rolname=$1`, user).Scan(&value); err != nil {
		t.Fatal(err)
	}
	return value
}

func TestIntegrationProvisionFreshAndRepeated(t *testing.T) {
	s, db := integrationSettings(t)
	first := ensure(t, *s)
	if !first.RoleCreated || !first.DatabaseCreated {
		t.Fatal("fresh provisioning did not create both objects")
	}
	before := verifier(t, db, s.User)
	if !strings.HasPrefix(before, "SCRAM-SHA-256$") || strings.Contains(before, s.Password) {
		t.Fatal("password was not stored as a SCRAM verifier")
	}
	app, err := sql.Open("postgres", s.AppURL)
	if err != nil {
		t.Fatal(err)
	}
	defer app.Close()
	if _, err := app.Exec(`CREATE TABLE retained (value text); INSERT INTO retained VALUES ('keep this row')`); err != nil {
		t.Fatal(err)
	}
	if again := ensure(t, *s); again.RoleCreated || again.DatabaseCreated {
		t.Fatal("repeated provisioning reported changes")
	}
	var value string
	if err := app.QueryRow(`SELECT value FROM retained`).Scan(&value); err != nil || value != "keep this row" {
		t.Fatal("existing data was not retained")
	}
	if verifier(t, db, s.User) != before {
		t.Fatal("existing password was changed")
	}
}

func TestIntegrationProvisionConcurrentJobs(t *testing.T) {
	s, _ := integrationSettings(t)
	type outcome struct {
		result Result
		err    error
	}
	results := make(chan outcome, 2)
	start := make(chan struct{})
	for range 2 {
		go func() {
			<-start
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			result, err := Ensure(ctx, *s)
			results <- outcome{result, err}
		}()
	}
	close(start)
	roles, databases := 0, 0
	for range 2 {
		outcome := <-results
		if outcome.err != nil {
			t.Error(outcome.err)
		}
		if outcome.result.RoleCreated {
			roles++
		}
		if outcome.result.DatabaseCreated {
			databases++
		}
	}
	if roles != 1 || databases != 1 {
		t.Fatal("concurrent provisioning must create each object exactly once")
	}
}

func TestIntegrationProvisionRejectsExistingPasswordMismatch(t *testing.T) {
	s, db := integrationSettings(t)
	ensure(t, *s)
	before := verifier(t, db, s.User)
	wrong := *s
	wrong.Password = "different-test-password"
	u, _ := url.Parse(s.AppURL)
	u.User = url.UserPassword(s.User, wrong.Password)
	wrong.AppURL = u.String()
	_, err := Ensure(context.Background(), wrong)
	if err == nil || !strings.Contains(err.Error(), "verify application login") || strings.Contains(err.Error(), wrong.Password) {
		t.Fatal("existing password mismatch must fail without exposing the password")
	}
	if verifier(t, db, s.User) != before {
		t.Fatal("existing password was reset")
	}
}

func TestIntegrationProvisionRejectsWrongOwnerAndElevatedRole(t *testing.T) {
	t.Run("wrong database owner", func(t *testing.T) {
		s, db := integrationSettings(t)
		if _, err := db.Exec(`CREATE DATABASE ` + pq.QuoteIdentifier(s.Database)); err != nil {
			t.Fatal(err)
		}
		if _, err := Ensure(context.Background(), *s); err == nil || !strings.Contains(err.Error(), "owned by DB_USER") {
			t.Fatal("unrelated database must not be adopted")
		}
		var roles int
		if err := db.QueryRow(`SELECT count(*) FROM pg_roles WHERE rolname=$1`, s.User).Scan(&roles); err != nil || roles != 0 {
			t.Fatal("owner conflict must be rejected before creating a role")
		}
	})
	t.Run("elevated existing role", func(t *testing.T) {
		s, db := integrationSettings(t)
		if _, err := db.Exec(`CREATE ROLE ` + pq.QuoteIdentifier(s.User) + ` LOGIN CREATEDB`); err != nil {
			t.Fatal(err)
		}
		if _, err := Ensure(context.Background(), *s); err == nil || !strings.Contains(err.Error(), "elevated privileges") {
			t.Fatal("elevated role must be rejected")
		}
		var elevated bool
		if err := db.QueryRow(`SELECT rolcreatedb FROM pg_roles WHERE rolname=$1`, s.User).Scan(&elevated); err != nil || !elevated {
			t.Fatal("existing privileges must remain unchanged")
		}
	})
}

func TestIntegrationProvisionExistingRoleAndQuotedNames(t *testing.T) {
	s, db := integrationSettings(t)
	s.User += `" quoted`
	s.Database += `" quoted`
	u, _ := url.Parse(s.AppURL)
	u.User = url.UserPassword(s.User, s.Password)
	u.Path = "/" + s.Database
	s.AppURL = u.String()
	password, err := passwordVerifier(s.Password)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`CREATE ROLE ` + pq.QuoteIdentifier(s.User) + ` LOGIN PASSWORD ` + pq.QuoteLiteral(password)); err != nil {
		t.Fatal(err)
	}
	result := ensure(t, *s)
	if result.RoleCreated || !result.DatabaseCreated {
		t.Fatal("expected only the missing database to be created")
	}
}
