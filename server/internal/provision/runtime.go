package provision

import (
	"context"
	"database/sql"
	"fmt"
	"github.com/lib/pq"
)

// GrantRuntime runs as the schema owner after migrations. The runtime login is
// created separately by the infrastructure administrator and has no memberships.
func GrantRuntime(ctx context.Context, db *sql.DB, role string) error {
	if role != "bulkbets_runtime" {
		return fmt.Errorf("unexpected runtime role")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var elevated bool
	err = tx.QueryRowContext(ctx, `SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=pg_roles.oid) FROM pg_roles WHERE rolname=$1`, role).Scan(&elevated)
	if err != nil || elevated {
		return fmt.Errorf("runtime role missing or privileged")
	}
	for _, query := range []string{
		`REVOKE CREATE ON SCHEMA public FROM PUBLIC, ` + pq.QuoteIdentifier(role),
		`GRANT USAGE ON SCHEMA public TO ` + pq.QuoteIdentifier(role),
		`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ` + pq.QuoteIdentifier(role),
		`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ` + pq.QuoteIdentifier(role),
	} {
		if _, err = tx.ExecContext(ctx, query); err != nil {
			return operationError("set runtime permissions", err)
		}
	}
	rows, err := tx.QueryContext(ctx, `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'goose_%'`)
	if err != nil {
		return err
	}
	var names []string
	for rows.Next() {
		var name string
		if err = rows.Scan(&name); err != nil {
			rows.Close()
			return err
		}
		names = append(names, name)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, name := range names {
		if _, err = tx.ExecContext(ctx, `GRANT SELECT, INSERT, UPDATE, DELETE ON public.`+pq.QuoteIdentifier(name)+` TO `+pq.QuoteIdentifier(role)); err != nil {
			return operationError("grant runtime table access", err)
		}
	}
	return tx.Commit()
}
