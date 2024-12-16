package store

import (
	"context"
	"database/sql"
	"errors"

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

func (s *UsersStore) CreateBet(ctx context.Context, betSlip *bets.BetSlip) (*Bet, error) {
	// Validate the bet request
	isValidStakeMultiplier := currency.IsNumber(betSlip.StakeMultiplier)

	if len(betSlip.ActiveBets) == 0 {
		return nil, errors.New("at least one bet component is required")
	}
	if !isValidStakeMultiplier || betSlip.StakeMultiplier <= 0 {
		return nil, errors.New("stake multiplier must be a valid number and greater than 0")
	}

	// SQL query
	query := `
        WITH mixed_bets AS (
    SELECT 
        a.accumulator_bet_id,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', b.id,
                'division_participant_id', b.division_participant_id,
                'bet_type_id', b.bet_type_id,
                'amount', b.amount,
                'odds_at_time', b.odds_at_time,
                'potential_payout', b.potential_payout
            )
        ) AS singular_bets
    FROM accumulator_bet_components a
    JOIN bets b ON a.singular_bet_id = b.id
    GROUP BY a.accumulator_bet_id
)
SELECT 
    b.id AS bet_id,
    b.user_id,
    b.amount,
    b.odds_at_time,
    b.potential_payout,
    b.created_at,
    b.status,
    COALESCE(m.singular_bets, '[]'::JSON) AS singular_bets
FROM bets b
LEFT JOIN mixed_bets m ON b.id = m.accumulator_bet_id
WHERE b.user_id = $1
ORDER BY b.created_at DESC;
    `

	// // Create singular bet records
	// var betIDs []uuid.UUID
	// for _, component := range betReq.BetComponents {
	// 	betID := uuid.New()
	// 	_, err = tx.ExecContext(ctx, `
	// 		INSERT INTO bets (
	// 			id, user_id, division_participant_id, bet_type_id, amount,
	// 			currency_code, odds_at_time, potential_payout, status, created_at, updated_at
	// 		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
	// 	`,
	// 		betID, betReq.UserID, component.DivisionParticipantID, component.BetTypeID,
	// 		component.Stake, betReq.CurrencyCode, component.OddsAtTime, component.PotentialPayout,
	// 	)
	// 	if err != nil {
	// 		return fmt.Errorf("failed to create singular bet: %w", err)
	// 	}
	// 	betIDs = append(betIDs, betID)
	// }

	// // Create accumulator bet record if applicable
	// if betReq.IsAccumulator {
	// 	accumulatorBetID := uuid.New()
	// 	_, err = tx.ExecContext(ctx, `
	// 		INSERT INTO bets (
	// 			id, user_id, division_participant_id, bet_type_id, amount,
	// 			currency_code, odds_at_time, potential_payout, status, created_at, updated_at
	// 		) VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, 'pending', NOW(), NOW())
	// 	`,
	// 		accumulatorBetID, betReq.UserID, betReq.TotalStake, betReq.CurrencyCode,
	// 		betReq.AccumulatorOdds, betReq.PotentialPayout,
	// 	)
	// 	if err != nil {
	// 		return fmt.Errorf("failed to create accumulator bet: %w", err)
	// 	}

	// 	// Link accumulator bet to components in accumulator_bet_components
	// 	for _, betID := range betIDs {
	// 		_, err = tx.ExecContext(ctx, `
	// 			INSERT INTO accumulator_bet_components (
	// 				accumulator_bet_id, singular_bet_id, created_at, updated_at
	// 			) VALUES ($1, $2, NOW(), NOW())
	// 		`,
	// 			accumulatorBetID, betID,
	// 		)
	// 		if err != nil {
	// 			return fmt.Errorf("failed to link accumulator bet components: %w", err)
	// 		}
	// 	}
	// }

	return &Bet{}, nil
}
