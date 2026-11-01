package store

import (
	"context"
	"database/sql"
	"errors"
	"math"

	"github.com/google/uuid"
)

var ErrDemoOnly = errors.New("this action requires a demo session")

type DemoStore struct{ db *sql.DB }

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
		if _, err := tx.ExecContext(ctx, `DELETE FROM transactions WHERE user_id = $1`, userID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM bets WHERE user_id = $1`, userID); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `UPDATE user_balances SET balance = 1000, version = version + 1 WHERE user_id = $1`, userID)
		return err
	})
}

// Each replay uses the lowest-priced athlete as its simulated winner. Only this
// visitor's pending bets change; official results and other visitors are untouched.
// The user lock also makes repeated/concurrent settlement requests idempotent.
func (s *DemoStore) Settle(ctx context.Context, userID string) (*DemoSettlement, error) {
	result := &DemoSettlement{}
	err := withTx(s.db, ctx, func(tx *sql.Tx) error {
		if err := lockDemo(ctx, tx, userID); err != nil {
			return err
		}
		queries := []string{
			`WITH winners AS (
                SELECT DISTINCT ON (p.division_id) p.division_id, p.id
                FROM division_participants p
                JOIN odds o ON o.division_participant_id = p.id
                JOIN bet_types bt ON bt.id = o.bet_type_id AND bt.name = 'win'
                WHERE p.status IN ('registered', 'active', 'fulfilled') AND o.odds_value > 1
                ORDER BY p.division_id, o.odds_value, p.id
            )
            UPDATE bets b SET status = CASE WHEN b.division_participant_id IN (SELECT id FROM winners)
                THEN 'won'::bet_status ELSE 'lost'::bet_status END, settled_at = NOW()
            WHERE b.user_id = $1 AND b.status = 'pending' AND b.division_participant_id IS NOT NULL
            RETURNING b.id, COALESCE(b.amount, 0), COALESCE(b.potential_payout, 0), b.status, b.currency_code`,
			`UPDATE bets b SET status = CASE WHEN NOT EXISTS (
                SELECT 1 FROM accumulator_bet_components ac JOIN bets component ON component.id = ac.singular_bet_id
                WHERE ac.accumulator_bet_id = b.id AND component.status != 'won'
            ) THEN 'won'::bet_status ELSE 'lost'::bet_status END, settled_at = NOW()
            WHERE b.user_id = $1 AND b.status = 'pending' AND b.division_participant_id IS NULL
            AND EXISTS (SELECT 1 FROM accumulator_bet_components ac WHERE ac.accumulator_bet_id = b.id)
            RETURNING b.id, COALESCE(b.amount, 0), COALESCE(b.potential_payout, 0), b.status, b.currency_code`,
		}
		type settledBet struct {
			id, status, currency string
			amount, payout       float64
		}
		var settled []settledBet
		for _, query := range queries {
			rows, err := tx.QueryContext(ctx, query, userID)
			if err != nil {
				return err
			}
			for rows.Next() {
				var bet settledBet
				if err := rows.Scan(&bet.id, &bet.amount, &bet.payout, &bet.status, &bet.currency); err != nil {
					rows.Close()
					return err
				}
				settled = append(settled, bet)
			}
			err = rows.Err()
			rows.Close()
			if err != nil {
				return err
			}
		}
		for _, bet := range settled {
			if bet.amount <= 0 {
				continue
			}
			result.SettledBets++
			if bet.status != "won" {
				continue
			}
			var before, after float64
			if err := tx.QueryRowContext(ctx, `UPDATE user_balances SET balance = balance + $1, version = version + 1
                WHERE user_id = $2 RETURNING balance - $1, balance`, bet.payout, userID).Scan(&before, &after); err != nil {
				return err
			}
			if _, err := tx.ExecContext(ctx, `INSERT INTO transactions
                (user_id, amount, currency_code, balance_before, balance_after, transaction_type, reference_id, status)
                VALUES ($1, $2, $3, $4, $5, 'DEMO_PAYOUT', $6, 'completed')`, userID, bet.payout, bet.currency, before, after, bet.id); err != nil {
				return err
			}
			result.Payout += bet.payout
		}
		result.Payout = math.Round(result.Payout*100) / 100
		return nil
	})
	return result, err
}
