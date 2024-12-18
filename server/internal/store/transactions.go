package store

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

type TransactionsStore struct {
	db *sql.DB
}

func NewTransactionsStore(db *sql.DB) *TransactionsStore {
	return &TransactionsStore{db: db}
}

type CreateBetTransactionParams struct {
	UserID        uuid.UUID
	Amount        float64
	CurrencyCode  string
	BalanceBefore float64
	BalanceAfter  float64
	BetID         uuid.UUID
}

func (s *TransactionsStore) CreateBetTransaction(ctx context.Context, params CreateBetTransactionParams) (*uuid.UUID, error) {
	var transactionID uuid.UUID

	withTx(s.db, ctx, func(tx *sql.Tx) error {
		query := `
    INSERT INTO transactions (
        user_id, 
        amount, 
        currency_code, 
        balance_before, 
        balance_after, 
        transaction_type, 
        reference_id,
        status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
    `

		err := tx.QueryRowContext(ctx,
			query,
			params.UserID,
			params.Amount,
			params.CurrencyCode,
			params.BalanceBefore,
			params.BalanceAfter,
			"BET_PLACEMENT",
			params.BetID,
			"completed",
		).Scan(&transactionID)

		if err != nil {
			return fmt.Errorf("failed to create bet transaction: %w", err)
		}

		return nil
	})

	return &transactionID, nil
}
