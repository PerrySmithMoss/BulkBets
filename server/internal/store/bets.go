package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/PerrySmithMoss/BulkBets/server/internal/bets"
	"github.com/PerrySmithMoss/BulkBets/server/internal/currency"
	"github.com/google/uuid"
)

var (
	ErrInsufficientFunds      = errors.New("insufficient funds")
	ErrInvalidStakeMultiplier = errors.New("stake multiplier must be a valid number and greater than 0")
	ErrNoBetComponents        = errors.New("at least one bet component is required")
	ErrConcurrentModification = errors.New("concurrent modification detected or balance update failed")
)

type BetsStore struct {
	db *sql.DB
}

func NewBetsStore(db *sql.DB) *BetsStore {
	return &BetsStore{db: db}
}

type SingularBet struct {
	Id                    uuid.UUID `json:"id"`
	UserId                uuid.UUID `json:"user_id"`
	DivisionParticipantId uuid.UUID `json:"division_participant_id"`
	BetTypeId             int       `json:"bet_type_id"`
	CurrencyCode          string    `json:"currency_code"`
	Amount                float64   `json:"amount"`
	OddsAtTime            float64   `json:"odds_at_time"`
	PotentialPayout       float64   `json:"potential_payout"`
}

type Bet struct {
	Id              uuid.UUID     `json:"id"`
	UserID          uuid.UUID     `json:"user_id"`
	Amount          float64       `json:"amount"`
	OddsAtTime      float64       `json:"odds_at_time"`
	PotentialPayout float64       `json:"potential_payout"`
	Status          string        `json:"status"`
	SingularBets    []SingularBet `json:"singular_bets"`
}

// createSingularBet handles the creation of a single bet record
func (s *BetsStore) createSingularBet(ctx context.Context, tx *sql.Tx, user *User, bet *bets.ActiveBet) (*SingularBet, error) {
	singularBet := &SingularBet{}
	err := tx.QueryRowContext(ctx, `
		INSERT INTO bets (
			user_id, division_participant_id, bet_type_id, amount,
			currency_code, odds_at_time, potential_payout
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, user_id, amount, currency_code, odds_at_time`,
		user.Id, bet.CompetitorId, bet.BetTypeId, bet.Amount,
		user.DefaultCurrency, bet.Odds, bet.PotentialPayout,
	).Scan(&singularBet.Id, &singularBet.UserId, &singularBet.Amount,
		&singularBet.CurrencyCode, &singularBet.OddsAtTime)

	if err != nil {
		return nil, fmt.Errorf("failed to insert singular bet: %w", err)
	}
	return singularBet, nil
}

// createAccumulatorBet handles the creation of an accumulator bet and its components
func (s *BetsStore) createAccumulatorBet(ctx context.Context, tx *sql.Tx, user *User,
	betSlip *bets.BetSlip, singularBets []SingularBet) (*SingularBet, error) {

	accumulatorBet := &SingularBet{}
	err := tx.QueryRowContext(ctx, `
		INSERT INTO bets (
			user_id, bet_type_id, amount, currency_code, odds_at_time, potential_payout
		) VALUES (
			$1, 
			(SELECT id FROM bet_types WHERE name = 'accumulator'), -- Fetch the bet_type_id dynamically
			$2, 
			$3, 
			$4, 
			$5
		)
		RETURNING id, user_id, amount, currency_code, odds_at_time`,
		user.Id,
		betSlip.StakeMultiplier,
		user.DefaultCurrency,
		betSlip.OddsAtTime,
		betSlip.PotentialPayout,
	).Scan(&accumulatorBet.Id, &accumulatorBet.UserId, &accumulatorBet.Amount,
		&accumulatorBet.CurrencyCode, &accumulatorBet.OddsAtTime)

	if err != nil {
		return nil, fmt.Errorf("failed to insert accumulator bet: %w", err)
	}

	// Link accumulator components
	for _, singularBet := range singularBets {
		_, err := tx.ExecContext(ctx, `
			INSERT INTO accumulator_bet_components (
				accumulator_bet_id, singular_bet_id
			) VALUES ($1, $2)`,
			accumulatorBet.Id, singularBet.Id,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to link accumulator bet components: %w", err)
		}
	}

	return accumulatorBet, nil
}

// createBetTransaction creates a transaction record for a bet
func (s *BetsStore) createBetTransaction(ctx context.Context, tx *sql.Tx,
	bet *SingularBet, balanceBefore, balanceAfter float64) error {
	// Negate the amount for bets since they decrease the balance
	transactionAmount := -bet.Amount

	_, err := tx.ExecContext(ctx, `
        INSERT INTO transactions (
            user_id, amount, currency_code, balance_before, 
            balance_after, transaction_type, reference_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		bet.UserId,
		transactionAmount,
		bet.CurrencyCode,
		balanceBefore,
		balanceAfter,
		"BET_PLACEMENT",
		bet.Id,
		"completed",
	)

	if err != nil {
		return fmt.Errorf("failed to create bet transaction: %w", err)
	}
	return nil
}

func (s *BetsStore) CreateBet(ctx context.Context, betSlip *bets.BetSlip, user *User) error {
	// Validate bet request
	if len(betSlip.ActiveBets) == 0 {
		return ErrNoBetComponents
	}
	if !currency.IsNumber(betSlip.StakeMultiplier) || betSlip.StakeMultiplier <= 0 {
		return ErrInvalidStakeMultiplier
	}

	isAccumulator := betSlip.StakeMultiplier > 0 && len(betSlip.ActiveBets) >= 2
	totalStake := bets.CalculateTotalStake(betSlip.StakeMultiplier, betSlip.ActiveBets)

	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		// Lock and get user's current balance
		var currentBalance float64
		var userVersion int
		err := tx.QueryRow(`
			SELECT balance, version 
			FROM user_balances 
			WHERE user_id = $1 
			FOR UPDATE`, user.Id).Scan(&currentBalance, &userVersion)
		if err != nil {
			return fmt.Errorf("failed to retrieve user balance: %v", err)
		}

		// Check sufficient balance
		if currentBalance < totalStake {
			return errors.New("insufficient funds")
		}

		//  Update balance with optimistic locking
		newBalance := currentBalance - totalStake
		result, err := tx.ExecContext(ctx, `
			UPDATE user_balances 
			SET balance = $1, 
				version = version + 1 
			WHERE user_id = $2 AND version = $3`,
			newBalance, user.Id, userVersion)
		if err != nil {
			return fmt.Errorf("failed to update balance: %w", err)
		}

		// Verify balance deduction was successful
		rowsAffected, err := result.RowsAffected()
		if err != nil || rowsAffected == 0 {
			return errors.New("concurrent modification detected or balance update failed")
		}

		// Create singular bets
		var singularBets []SingularBet
		runningBalance := currentBalance

		for _, bet := range betSlip.ActiveBets {
			singularBet, err := s.createSingularBet(ctx, tx, user, &bet)
			if err != nil {
				return err
			}
			singularBets = append(singularBets, *singularBet)

			// Calculate balances for this specific transaction
			balanceAfter := runningBalance - bet.Amount

			// Create transaction for singular bet
			err = s.createBetTransaction(ctx, tx, singularBet, runningBalance, balanceAfter)
			if err != nil {
				return err
			}

			runningBalance = balanceAfter
		}

		// Create accumulator bet if applicable
		if isAccumulator {
			accumulatorBet, err := s.createAccumulatorBet(ctx, tx, user, betSlip, singularBets)
			if err != nil {
				return err
			}

			// Calculate balances for accumulator transaction
			balanceAfter := runningBalance - betSlip.StakeMultiplier

			// Create transaction for accumulator bet
			err = s.createBetTransaction(ctx, tx, accumulatorBet, runningBalance, balanceAfter)
			if err != nil {
				return err
			}
		}

		return nil
	})
}

// func (s *UsersStore) FetchBets(ctx context.Context, userId string) (*Bet, error) {
// 	// SQL query
// 	query := `
//         WITH mixed_bets AS (
//     SELECT
//         a.accumulator_bet_id,
//         JSON_AGG(
//             JSON_BUILD_OBJECT(
//                 'id', b.id,
//                 'division_participant_id', b.division_participant_id,
//                 'bet_type_id', b.bet_type_id,
//                 'amount', b.amount,
//                 'odds_at_time', b.odds_at_time,
//                 'potential_payout', b.potential_payout
//             )
//         ) AS singular_bets
//     FROM accumulator_bet_components a
//     JOIN bets b ON a.singular_bet_id = b.id
//     GROUP BY a.accumulator_bet_id
// )
// SELECT
//     b.id AS bet_id,
//     b.user_id,
//     b.amount,
//     b.odds_at_time,
//     b.potential_payout,
//     b.created_at,
//     b.status,
//     COALESCE(m.singular_bets, '[]'::JSON) AS singular_bets
// FROM bets b
// LEFT JOIN mixed_bets m ON b.id = m.accumulator_bet_id
// WHERE b.user_id = $1
// ORDER BY b.created_at DESC;
//     `
// }
