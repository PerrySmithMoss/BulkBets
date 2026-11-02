package store

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"time"

	"github.com/google/uuid"
)

var ErrInvalidInput = errors.New("check the supplied details")

type WalletTransaction struct {
	ID           string    `json:"id"`
	Amount       float64   `json:"amount"`
	Currency     string    `json:"currency"`
	BalanceAfter float64   `json:"balance_after"`
	Kind         string    `json:"kind"`
	CreatedAt    time.Time `json:"created_at"`
}

func (s *DemoStore) Wallet(ctx context.Context, userID string) ([]WalletTransaction, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, amount, currency_code, balance_after, transaction_type, created_at
 FROM transactions WHERE user_id=$1 ORDER BY created_at DESC, id DESC LIMIT 100`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]WalletTransaction, 0)
	for rows.Next() {
		var item WalletTransaction
		if err := rows.Scan(&item.ID, &item.Amount, &item.Currency, &item.BalanceAfter, &item.Kind, &item.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

// The user lock serializes wallet requests with placement, settlement and reset.
// A request UUID is bound to its payload, so retries cannot duplicate a transfer.
func (s *DemoStore) Transfer(ctx context.Context, userID, key, kind string, amount float64) (*WalletTransaction, error) {
	if _, err := uuid.Parse(key); err != nil {
		return nil, ErrInvalidInput
	}
	if math.IsNaN(amount) || math.IsInf(amount, 0) || amount <= 0 || amount > 10000 || math.Abs(amount*100-math.Round(amount*100)) > 0.000001 || (kind != "DEMO_DEPOSIT" && kind != "DEMO_WITHDRAWAL") {
		return nil, ErrInvalidInput
	}
	result := &WalletTransaction{}
	err := withTx(s.db, ctx, func(tx *sql.Tx) error {
		if err := lockDemo(ctx, tx, userID); err != nil {
			return err
		}
		var savedKind string
		var savedAmount float64
		err := tx.QueryRowContext(ctx, `SELECT w.kind,w.amount,t.id,t.amount,t.currency_code,t.balance_after,t.transaction_type,t.created_at
   FROM wallet_requests w JOIN transactions t ON t.id=w.transaction_id WHERE w.user_id=$1 AND w.request_key=$2`, userID, key).
			Scan(&savedKind, &savedAmount, &result.ID, &result.Amount, &result.Currency, &result.BalanceAfter, &result.Kind, &result.CreatedAt)
		if err == nil {
			if savedKind != kind || savedAmount != amount {
				return ErrConflict
			}
			return nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		cents := int64(math.Round(amount * 100))
		if kind == "DEMO_WITHDRAWAL" {
			cents = -cents
		}
		var before, after float64
		err = tx.QueryRowContext(ctx, `UPDATE user_balances SET balance=balance+($1::numeric/100),version=version+1
    WHERE user_id=$2 AND balance+($1::numeric/100)>=0 AND ($1<0 OR balance+($1::numeric/100)<=1000000)
    RETURNING balance-($1::numeric/100),balance`, cents, userID).Scan(&before, &after)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrInsufficientFunds
		}
		if err != nil {
			return err
		}
		err = tx.QueryRowContext(ctx, `INSERT INTO transactions (user_id,amount,currency_code,balance_before,balance_after,transaction_type,reference_id,status)
   VALUES ($1,$2::numeric/100,'GBP',$3,$4,$5,$6,'completed') RETURNING id,amount,currency_code,balance_after,transaction_type,created_at`, userID, cents, before, after, kind, key).
			Scan(&result.ID, &result.Amount, &result.Currency, &result.BalanceAfter, &result.Kind, &result.CreatedAt)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `INSERT INTO wallet_requests (user_id,request_key,kind,amount,transaction_id) VALUES ($1,$2,$3,$4,$5)`, userID, key, kind, amount, result.ID)
		return err
	})
	return result, err
}
