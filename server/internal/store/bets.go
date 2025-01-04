package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strconv"

	"github.com/PerrySmithMoss/BulkBets/server/internal/bets"
	"github.com/google/uuid"
	"github.com/lib/pq"
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

type BetResponse struct {
	ID                    string   `json:"id"`
	UserID                string   `json:"user_id"`
	DivisionParticipantID *string  `json:"division_participant_id,omitempty"`
	BetType               int64    `json:"bet_type"`
	BetTypeName           string   `json:"bet_type_name"`
	Amount                float64  `json:"amount"`
	Currency              string   `json:"currency"`
	OddsAtTime            float64  `json:"odds_at_time"`
	PotentialPayout       float64  `json:"potential_payout"`
	Status                string   `json:"status"`
	CancelledAt           *string  `json:"cancelled_at,omitempty"`
	CreatedAt             string   `json:"created_at"`
	UpdatedAt             string   `json:"updated_at"`
	SettledAt             *string  `json:"settled_at,omitempty"`
	IsAccumulator         bool     `json:"is_accumulator"`
	Components            []string `json:"components,omitempty"`

	Show     *Show     `json:"show,omitempty"`
	Athlete  *Athlete  `json:"athlete,omitempty"`
	Division *Division `json:"division,omitempty"`
}

// createSingularBet handles the creation of a single bet record
func (s *BetsStore) createSingularBet(ctx context.Context, tx *sql.Tx, user *User, bet *bets.ActiveBet) (*SingularBet, error) {
	singularBet := &SingularBet{}
	err := tx.QueryRowContext(ctx, `
		INSERT INTO bets (user_id, division_participant_id, bet_type_id, amount, currency_code, odds_at_time, potential_payout)
		    VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING
		    id, user_id, amount, currency_code, odds_at_time`,
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
		INSERT INTO bets (user_id, bet_type_id, amount, currency_code, odds_at_time, potential_payout)
		    VALUES ($1, (
		            SELECT
		                id
		            FROM
		                bet_types
		            WHERE
		                name = 'accumulator'), -- Fetch the bet_type_id dynamically
		            $2, $3, $4, $5)
		RETURNING
		    id,
		    user_id,
		    amount,
		    currency_code,
		    odds_at_time`,
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
			INSERT INTO accumulator_bet_components (accumulator_bet_id, singular_bet_id)
			    VALUES ($1, $2)`,
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
		INSERT INTO transactions (user_id, amount, currency_code, balance_before, balance_after, transaction_type, reference_id, status)
		    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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

	// Check if the bet is an accumulator
	isAccumulator := bets.IsAccumulatorBet(*betSlip)

	// Validate accumulator bet rules
	if isAccumulator {
		if err := bets.IsValidAccumulatorBet(*betSlip); err != nil {
			return ErrInvalidStakeMultiplier
		}
	}

	totalStake := bets.CalculateTotalStake(*betSlip)

	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		// Lock and get user's current balance
		var currentBalance float64
		var userVersion int
		err := tx.QueryRow(`
			SELECT
			    balance,
			    version
			FROM
			    user_balances
			WHERE
			    user_id = $1
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
			UPDATE
			    user_balances
			SET
			    balance = $1,
			    version = version + 1
			WHERE
			    user_id = $2
			    AND version = $3`,
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

			multiplier := 0.0
			if betSlip.StakeMultiplier != nil {
				multiplier = *betSlip.StakeMultiplier
			}

			// Calculate balances for accumulator transaction
			balanceAfter := runningBalance - multiplier

			// Create transaction for accumulator bet
			err = s.createBetTransaction(ctx, tx, accumulatorBet, runningBalance, balanceAfter)
			if err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *BetsStore) FetchUserBets(ctx context.Context, userId string, status []string, limit int, offset int) ([]BetResponse, error) {
	query := `
		WITH bet_components AS (
		    SELECT
		        abc.accumulator_bet_id,
		        ARRAY_AGG(abc.singular_bet_id ORDER BY abc.singular_bet_id) AS component_ids
		    FROM
		        accumulator_bet_components abc
		    GROUP BY
		        abc.accumulator_bet_id
		)
		SELECT DISTINCT ON (b.id)
		    b.id,
		    b.division_participant_id,
		    b.bet_type_id,
		    b.amount,
		    b.currency_code,
		    b.odds_at_time,
		    b.potential_payout,
		    b.status,
		    b.cancelled_at,
		    b.created_at,
		    b.settled_at,
		    bt.name AS bet_type_name,
		    CASE WHEN bc.accumulator_bet_id IS NOT NULL THEN
		        TRUE
		    ELSE
		        FALSE
		    END AS is_accumulator,
		    COALESCE(bc.component_ids, ARRAY[]::UUID[]) AS component_ids,
		    s.id AS show_id,
		    s.name AS show_name,
		    s.location AS show_location,
		    s.start_time AS show_start_time,
		    s.end_time AS show_end_time,
		    s.status AS show_status,
		    a.id AS athlete_id,
		    a.first_name AS athlete_first_name,
		    a.last_name AS athlete_last_name,
		    a.nationality AS athlete_nationality,
		    a.gender AS athlete_gender,
		    d.id AS division_id,
		    d.name AS division_name,
		    d.category AS division_category,
		    d.status AS division_status,
		    d.start_time AS division_start_time
		FROM
		    bets b
		    LEFT JOIN bet_types bt ON b.bet_type_id = bt.id
		    LEFT JOIN bet_components bc ON b.id = bc.accumulator_bet_id
		    LEFT JOIN division_participants dp ON b.division_participant_id = dp.id
		    LEFT JOIN divisions d ON dp.division_id = d.id
		    LEFT JOIN athletes a ON dp.athlete_id = a.id
		    LEFT JOIN shows s ON d.show_id = s.id
		WHERE
		    b.user_id = $1
		    AND (
		        CASE WHEN $2 = '{}'::TEXT[] THEN
		            TRUE
		        WHEN 'live' = ANY ($2) THEN
		            NOW() BETWEEN s.start_time AND s.end_time
		        WHEN 'unsettled' = ANY ($2) THEN
		            b.status::TEXT = 'pending'
		        WHEN 'settled' = ANY ($2) THEN
		            b.status::TEXT IN ('won', 'lost', 'void, cancelled')
		        ELSE
		            b.status::TEXT = ANY ($2) -- Cast status to text for comparison
		        END)
		ORDER BY
		    b.id,
		    b.created_at DESC
		LIMIT $3 OFFSET $4;
		
		`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	if len(status) == 0 {
		status = []string{}
	}

	rows, err := s.db.QueryContext(ctx, query, userId, pq.Array(status), limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	var bets []BetResponse

	for rows.Next() {
		var bet BetResponse
		var cancelledAt, settledAt sql.NullString
		var divisionParticipantID sql.NullString
		var divisionID, divisionName, divisionCategory, divisionStatus sql.NullString
		var divisionStartTime sql.NullTime

		var athleteID, athleteFirstName, athleteLastName, athleteNationality, athleteGender sql.NullString
		var showID, showName, showLocation, showStatus sql.NullString
		var showStartTime, showEndTime sql.NullTime
		var componentIds []sql.NullString

		if err := rows.Scan(
			&bet.ID,
			&divisionParticipantID,
			&bet.BetType,
			&bet.Amount,
			&bet.Currency,
			&bet.OddsAtTime,
			&bet.PotentialPayout,
			&bet.Status,
			&cancelledAt,
			&bet.CreatedAt,
			&settledAt,
			&bet.BetTypeName,
			&bet.IsAccumulator,
			pq.Array(&componentIds),
			&showID,
			&showName,
			&showLocation,
			&showStartTime,
			&showEndTime,
			&showStatus,
			&athleteID,
			&athleteFirstName,
			&athleteLastName,
			&athleteNationality,
			&athleteGender,
			&divisionID,
			&divisionName,
			&divisionCategory,
			&divisionStatus,
			&divisionStartTime,
		); err != nil {
			return nil, fmt.Errorf("failed to parse bet (ID: %v): %w", bet.ID, err)
		}

		if bet.IsAccumulator {
			// Skip athlete and show information for accumulator bets
			bet.Athlete = nil
			bet.Show = nil
			bet.Division = nil
		} else {
			// Assign nested objects
			if athleteID.Valid {
				bet.Athlete = &Athlete{
					ID:          athleteID.String,
					FirstName:   athleteFirstName.String,
					LastName:    athleteLastName.String,
					Nationality: athleteNationality.String,
					Gender:      athleteGender.String,
				}
			}

			if divisionID.Valid {
				parsedDivisionID, err := strconv.ParseInt(divisionID.String, 10, 64)
				if err != nil {
					return nil, fmt.Errorf("failed to parse divisionID %v: %w", divisionID, err)
				}

				var category *string
				if divisionCategory.Valid {
					category = &divisionCategory.String
				}

				bet.Division = &Division{
					ID:        parsedDivisionID,
					Name:      divisionName.String,
					Category:  category,
					Status:    divisionStatus.String,
					StartTime: divisionStartTime.Time,
				}
			}

			if showID.Valid {
				parsedShowID, err := strconv.ParseInt(showID.String, 10, 64)
				if err != nil {
					return nil, fmt.Errorf("failed to parse showID: %w", err)
				}

				var location *string
				if showLocation.Valid {
					location = &showLocation.String
				}

				bet.Show = &Show{
					ID:        parsedShowID,
					Name:      showName.String,
					Location:  location,
					StartTime: showStartTime.Time,
					EndTime:   showEndTime.Time,
					Status:    showStatus.String,
				}
			}
		}

		if divisionParticipantID.Valid {
			divisionParticipantID := divisionParticipantID.String
			bet.DivisionParticipantID = &divisionParticipantID
		}
		if cancelledAt.Valid {
			cancelledAt := cancelledAt.String
			bet.CancelledAt = &cancelledAt
		}
		if settledAt.Valid {
			settledAt := settledAt.String
			bet.SettledAt = &settledAt
		}

		// Convert component IDs from sql.NullString to string
		bet.Components = make([]string, 0, len(componentIds))
		for _, id := range componentIds {
			if id.Valid {
				bet.Components = append(bet.Components, id.String)
			}
		}

		bets = append(bets, bet)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over rows: %w", err)
	}

	return bets, nil
}

func (s *BetsStore) GetUnsettledBetsForDivision(ctx context.Context, tx *sql.Tx, divisionID int64) ([]BetResponse, error) {
	query := `
		WITH unsettled_singular_bets AS (
		    SELECT
		        b.id AS bet_id,
		        b.user_id,
		        b.division_participant_id,
		        b.bet_type_id,
		        bt.name AS bet_type_name,
		        b.amount,
		        b.currency_code,
		        b.odds_at_time,
		        b.potential_payout,
		        b.status,
		        b.created_at,
		        b.updated_at,
		        b.settled_at,
		        b.cancelled_at
		    FROM
		        bets b
		        INNER JOIN bet_types bt ON b.bet_type_id = bt.id
		        INNER JOIN division_participants dp ON b.division_participant_id = dp.id
		    WHERE
		        b.status = 'pending'
		        AND b.settled_at IS NULL
		        AND b.cancelled_at IS NULL
		        AND dp.division_id = $1
		),
		unsettled_accumulator_bets AS (
		    SELECT DISTINCT
		        ab.id AS bet_id,
		        ab.user_id,
		        NULL AS division_participant_id,
		        ab.bet_type_id,
		        bt.name AS bet_type_name,
		        ab.amount,
		        ab.currency_code,
		        ab.total_odds AS odds_at_time,
		        ab.potential_payout,
		        ab.status,
		        ab.created_at,
		        ab.updated_at,
		        ab.settled_at,
		        ab.cancelled_at
		    FROM
		        accumulator_bets ab
		        INNER JOIN bet_types bt ON ab.bet_type_id = bt.id
		        INNER JOIN accumulator_bet_components abc ON ab.id = abc.accumulator_bet_id
		        INNER JOIN bets sb ON abc.singular_bet_id = sb.id
		        INNER JOIN division_participants dp ON sb.division_participant_id = dp.id
		    WHERE
		        ab.status = 'pending'
		        AND ab.settled_at IS NULL
		        AND ab.cancelled_at IS NULL
		        AND dp.division_id = $1
		)
		SELECT
		    *
		FROM (
		    SELECT
		        *
		    FROM
		        unsettled_singular_bets
		    UNION ALL
		    SELECT
		        *
		    FROM
		        unsettled_accumulator_bets) combined_bets
		ORDER BY
		    created_at DESC`

	// Use provided transaction if available, otherwise use db
	// queryer := s.db
	// if tx != nil {
	//     queryer = tx
	// }

	ctxWithTimeout, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	rows, err := tx.QueryContext(ctxWithTimeout, query, divisionID)
	if err != nil {
		return nil, fmt.Errorf("failed to execute unsettled bets query: %w", err)
	}
	defer rows.Close()

	var bets []BetResponse
	for rows.Next() {
		var bet BetResponse
		var divisionParticipantID, settledAt, cancelledAt sql.NullString

		err := rows.Scan(
			&bet.ID,
			&bet.UserID,
			&divisionParticipantID,
			&bet.BetType,
			&bet.BetTypeName,
			&bet.Amount,
			&bet.Currency,
			&bet.OddsAtTime,
			&bet.PotentialPayout,
			&bet.Status,
			&bet.CreatedAt,
			&bet.UpdatedAt,
			&settledAt,
			&cancelledAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan bet row: %w", err)
		}

		if divisionParticipantID.Valid {
			bet.DivisionParticipantID = &divisionParticipantID.String
		}
		if settledAt.Valid {
			bet.SettledAt = &settledAt.String
		}
		if cancelledAt.Valid {
			bet.CancelledAt = &cancelledAt.String
		}

		bets = append(bets, bet)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating bet rows: %w", err)
	}

	return bets, nil
}

type BetSettlement struct {
	DivisionID       int64
	DivisionResultID int64
	Outcomes         []DivisionOutcomeParams
}

func (s *BetsStore) SettleDivisionBets(ctx context.Context, settlement BetSettlement) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		// TODO: fetch and settle bets in batches (will likely have to implement Kafka/RabbitMQ
		// to asynchronously batch process all the bets tied to the division result)
		bets, err := s.GetUnsettledBetsForDivision(ctx, tx, settlement.DivisionID)
		if err != nil {
			return fmt.Errorf("failed to get unsettled bets: %w", err)
		}

		log.Printf("bets: %v", bets)

		// // 2. Process single bets
		// if err := processSingleBets(ctx, tx, bets.SingleBets, settlement); err != nil {
		// 	return fmt.Errorf("failed to process single bets: %w", err)
		// }

		// // 3. Process accumulator bets
		// if err := processAccumulatorBets(ctx, tx, bets.AccumulatorBets, settlement); err != nil {
		// 	return fmt.Errorf("failed to process accumulator bets: %w", err)
		// }

		// // Commit the transaction
		// if err := tx.Commit(); err != nil {
		// 	return fmt.Errorf("failed to commit transaction: %w", err)
		// }

		return nil
	})
}
