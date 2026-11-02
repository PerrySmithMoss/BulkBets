package store

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
)

var ErrDemoOnly = errors.New("this action requires a demo session")

type DemoStore struct {
	db            *sql.DB
	maintenanceMu sync.Mutex
	lastCleanup   time.Time
}

type DemoSettlement struct {
	SettledBets int     `json:"settled_bets"`
	Payout      float64 `json:"payout"`
}

func (s *DemoStore) Create(ctx context.Context) (*User, error) {
	id := uuid.New()
	err := withTx(s.db, ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `INSERT INTO users (id, first_name, last_name, email, is_demo)
            VALUES ($1, 'Demo', 'Visitor', $2, TRUE)`, id, id.String()+"@demo.bulkbets.invalid"); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `INSERT INTO user_balances (user_id, balance) VALUES ($1, 1000)`, id)
		return err
	})
	if err != nil {
		return nil, err
	}
	return NewUsersStore(s.db).GetUserByID(ctx, id.String())
}

func lockDemo(ctx context.Context, tx *sql.Tx, userID string) error {
	var demo bool
	if err := tx.QueryRowContext(ctx, `SELECT is_demo FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&demo); err != nil {
		return err
	}
	if !demo {
		return ErrDemoOnly
	}
	return nil
}

func (s *DemoStore) Reset(ctx context.Context, userID string) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		if err := lockDemo(ctx, tx, userID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM wallet_requests WHERE user_id=$1`, userID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM transactions WHERE user_id = $1`, userID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM bets WHERE user_id = $1`, userID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM shows WHERE owner_id=$1`, userID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM athletes WHERE meta_data->>'sandbox_owner'=$1 AND NOT EXISTS (SELECT 1 FROM division_participants WHERE athlete_id=athletes.id)`, userID); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `UPDATE user_balances SET balance = 1000, version = version + 1 WHERE user_id = $1`, userID)
		return err
	})
}

// Shared historical replays remain repeatable; sandbox events have their own lifecycle.
func (s *DemoStore) Settle(ctx context.Context, userID string) (*DemoSettlement, error) {
	return s.SettleScenario(ctx, userID, "favourite")
}

func (s *DemoStore) SettleScenario(ctx context.Context, userID, mode string) (*DemoSettlement, error) {
	if !validMode(mode) {
		return nil, ErrInvalidInput
	}
	var result *DemoSettlement
	err := withTx(s.db, ctx, func(tx *sql.Tx) error {
		if err := lockDemo(ctx, tx, userID); err != nil {
			return err
		}
		divisions, winners, err := simulationSelections(ctx, tx, userID, 0, mode)
		if err != nil {
			return err
		}
		result, err = settleUserTx(ctx, tx, userID, divisions, winners, mode == "void")
		return err
	})
	return result, err
}
