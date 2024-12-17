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

type BetsStore struct {
	db *sql.DB
}

func NewBetsStore(db *sql.DB) *BetsStore {
	return &BetsStore{db: db}
}

type SingularBet struct {
	Id                    uuid.UUID `json:"id"`
	DivisionParticipantId uuid.UUID `json:"division_participant_id"`
	BetTypeId             int       `json:"bet_type_id"`
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

func (s *BetsStore) CreateBet(ctx context.Context, betSlip *bets.BetSlip, user *User) error {
	// Validate the bet request
	isValidStakeMultiplier := currency.IsNumber(betSlip.StakeMultiplier)
	isAccumulator := isValidStakeMultiplier && len(betSlip.ActiveBets) >= 2
	totalStake := bets.CalculateTotalStake(betSlip.StakeMultiplier, betSlip.ActiveBets)

	if len(betSlip.ActiveBets) == 0 {
		return errors.New("at least one bet component is required")
	}
	if !isValidStakeMultiplier || betSlip.StakeMultiplier <= 0 {
		return errors.New("stake multiplier must be a valid number and greater than 0")
	}

	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		// 1. First, check and deduct user balance
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

		// Update balance with optimistic locking
		balanceResult, err := tx.Exec(`
			UPDATE user_balances 
			SET balance = balance - $1, 
				version = version + 1 
			WHERE user_id = $2 AND version = $3
		`, totalStake, user.Id, userVersion)
		if err != nil {
			return fmt.Errorf("failed to update balance: %v", err)
		}

		// Verify balance deduction was successful
		rowsAffected, err := balanceResult.RowsAffected()
		if err != nil || rowsAffected == 0 {
			return errors.New("concurrent modification detected or balance update failed")
		}

		// 2. Create bet records
		// TODO: extract into separate store func
		var singularBetIDs []uuid.UUID
		// Create singular bet records
		for _, bet := range betSlip.ActiveBets {
			var betID uuid.UUID
			err := tx.QueryRowContext(ctx, `
				INSERT INTO bets (
					user_id, division_participant_id, bet_type_id, amount,
					currency_code, odds_at_time, potential_payout
				) VALUES ($1, $2, $3, $4, $5, $6, $7)
				RETURNING id`,
				user.Id, bet.CompetitorId, bet.BetTypeId, bet.Amount,
				user.DefaultCurrency, bet.Odds, bet.PotentialPayout,
			).Scan(&betID)

			if err != nil {
				return fmt.Errorf("failed to insert singular bet: %w", err)
			}

			singularBetIDs = append(singularBetIDs, betID)
		}

		// TODO: extract into separate store func
		// Create accumulator bet record if applicable
		if isAccumulator {
			var accumulatorBetID uuid.UUID

			// Insert the accumulator bet
			err := tx.QueryRowContext(ctx, `
				INSERT INTO bets (
					user_id, amount, currency_code, odds_at_time, potential_payout
				) VALUES ($1, $2, $3, $4, $5)
				RETURNING id`,
				user.Id, betSlip.StakeMultiplier, user.DefaultCurrency,
				betSlip.OddsAtTime, betSlip.PotentialPayout,
			).Scan(&accumulatorBetID)

			if err != nil {
				return fmt.Errorf("failed to insert accumulator bet: %w", err)
			}

			// Link the accumulator bet to its components
			for _, singularBetID := range singularBetIDs {
				_, err := tx.ExecContext(ctx, `
			INSERT INTO accumulator_bet_components (
				accumulator_bet_id, singular_bet_id
			) VALUES ($1, $2)`,
					accumulatorBetID, singularBetID,
				)
				if err != nil {
					return fmt.Errorf("failed to link accumulator bet components: %w", err)
				}
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
