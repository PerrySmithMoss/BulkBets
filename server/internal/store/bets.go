package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strconv"

	"github.com/PerrySmithMoss/BulkBets/server/internal/bets"
	"github.com/PerrySmithMoss/BulkBets/server/internal/currency"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

var (
	ErrInsufficientFunds      = errors.New("insufficient funds")
	ErrInvalidStakeMultiplier = errors.New("stake multiplier must be a valid number and greater than 0")
	ErrInvalidSingularBet     = errors.New("stakeMultiplier or bet amount must contain valid amount")
	ErrInvalidActiveBets      = errors.New("all activeBets must contain a valid number greater than 0")
	ErrNoBetComponents        = errors.New("at least one bet component is required")
	ErrConcurrentModification = errors.New("concurrent modification detected or balance update failed")
	ErrMarketClosed           = errors.New("one or more markets are closed or unavailable")
	ErrOddsChanged            = errors.New("odds have changed; remove the selection and choose the latest price")
)

type BetsStore struct {
	db *sql.DB
}

func NewBetsStore(db *sql.DB) *BetsStore {
	return &BetsStore{db: db}
}

type BetStatus string

const (
	BetStatusWon       BetStatus = "won"
	BetStatusLost      BetStatus = "lost"
	BetStatusPending   BetStatus = "pending"
	BetStatusVoid      BetStatus = "void"
	BetStatusCancelled BetStatus = "cancelled"
)

type SingularBet struct {
	Id                    uuid.UUID `json:"id"`
	UserId                uuid.UUID `json:"user_id"`
	DivisionParticipantId uuid.UUID `json:"division_participant_id"`
	BetTypeId             int       `json:"bet_type_id"`
	CurrencyCode          string    `json:"currency_code"`
	Amount                *float64  `json:"amount"`
	OddsAtTime            float64   `json:"odds_at_time"`
	Status                BetStatus `json:"status"`
	PotentialPayout       float64   `json:"potential_payout"`
}

type Bet struct {
	Id              uuid.UUID     `json:"id"`
	UserID          uuid.UUID     `json:"user_id"`
	Amount          float64       `json:"amount"`
	OddsAtTime      float64       `json:"odds_at_time"`
	PotentialPayout float64       `json:"potential_payout"`
	Status          BetStatus     `json:"status"`
	SingularBets    []SingularBet `json:"singular_bets"`
}

type BetResponse struct {
	ID                    string    `json:"id"`
	UserID                string    `json:"user_id,omitempty"`
	DivisionParticipantID *string   `json:"division_participant_id,omitempty"`
	BetType               int64     `json:"bet_type"`
	BetTypeName           string    `json:"bet_type_name"`
	IsComponent           string    `json:"is_component,omitempty"`
	Amount                float64   `json:"amount"`
	Currency              string    `json:"currency"`
	OddsAtTime            float64   `json:"odds_at_time"`
	PotentialPayout       float64   `json:"potential_payout"`
	Status                BetStatus `json:"status"`
	CancelledAt           *string   `json:"cancelled_at,omitempty"`
	CreatedAt             string    `json:"created_at"`
	UpdatedAt             string    `json:"updated_at,omitempty"`
	SettledAt             *string   `json:"settled_at,omitempty"`
	IsAccumulator         bool      `json:"is_accumulator"`
	Components            []string  `json:"components,omitempty"`

	Show     *Show     `json:"show,omitempty"`
	Athlete  *Athlete  `json:"athlete,omitempty"`
	Division *Division `json:"division,omitempty"`
}

// createSingularBet handles the creation of a single bet record
func (s *BetsStore) createSingularBet(ctx context.Context, tx *sql.Tx, user *User, bet *bets.ActiveBet, IsComponent bool) (*SingularBet, error) {
	singularBet := &SingularBet{}
	err := tx.QueryRowContext(ctx, `
		INSERT INTO bets (user_id, division_participant_id, bet_type_id, amount, currency_code, odds_at_time, potential_payout, is_component)
		    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING
		    id, user_id, amount, currency_code, odds_at_time`,
		user.Id, bet.CompetitorId, bet.BetTypeId, bet.Amount,
		user.DefaultCurrency, bet.Odds, bet.PotentialPayout, IsComponent,
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

	// TODO: If singular bet is part of of an accumulator with no amount the potential payout is being stored as 0.0 instead of NULL?
	accumulatorBet := &SingularBet{}
	err := tx.QueryRowContext(ctx, `
		INSERT INTO bets (user_id, bet_type_id, amount, currency_code, odds_at_time, potential_payout, is_component)
		    VALUES ($1, (
		            SELECT
		                id
		            FROM
		                bet_types
		            WHERE
		                name = 'accumulator'), -- Fetch the bet_type_id dynamically
		            $2, $3, $4, $5, FALSE)
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
// isAddingFunds determines whether the transaction is positive (adding funds) or negative (removing funds)
func (s *BetsStore) createBetTransaction(ctx context.Context, tx *sql.Tx,
	bet *SingularBet, balanceBefore, balanceAfter float64, isAddingFunds bool) error {
	// we don't need to create a transaction for bets with 0 value
	// AKA bets which are part of an accumulator
	if bet.Amount == nil || *bet.Amount <= 0 {
		return nil
	}

	// Determine the transaction amount based on isAddingFunds flag
	var transactionAmount float64
	if isAddingFunds {
		transactionAmount = *bet.Amount // Positive transaction, add funds
	} else {
		transactionAmount = -(*bet.Amount) // Negative transaction, subtract funds
	}

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

	// Validate singular bets
	if len(betSlip.ActiveBets) > 1 {
		if err := bets.IsBetsValid(betSlip.ActiveBets); err != nil {
			return ErrInvalidActiveBets
		}
	}

	if len(betSlip.ActiveBets) == 1 {
		// Check if both Amount and StakeMultiplier are missing or invalid
		if (betSlip.ActiveBets[0].Amount == nil || *betSlip.ActiveBets[0].Amount <= 0) &&
			(betSlip.StakeMultiplier == nil || *betSlip.StakeMultiplier <= 0) {
			return ErrInvalidSingularBet
		}

		// Use StakeMultiplier as the bet amount if StakeMultiplier is valid
		if betSlip.StakeMultiplier != nil && *betSlip.StakeMultiplier > 0 {
			if betSlip.ActiveBets[0].Amount == nil {
				betSlip.ActiveBets[0].Amount = new(float64) // Allocate memory for Amount if nil
			}
			*betSlip.ActiveBets[0].Amount = *betSlip.StakeMultiplier

			potentialPayout := *betSlip.StakeMultiplier * betSlip.ActiveBets[0].Odds
			betSlip.ActiveBets[0].PotentialPayout = &potentialPayout

			// Reset StakeMultiplier to 0
			zero := 0.0
			betSlip.StakeMultiplier = &zero
		}
	}

	totalStake := bets.CalculateTotalStake(*betSlip)

	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		// Validate against authoritative rows in the same transaction as the debit.
		// Shared locks prevent settlement/status/price changes until this bet commits.
		for _, selection := range betSlip.ActiveBets {
			var open bool
			var currentOdds float64
			err := tx.QueryRowContext(ctx, `
				SELECT s.status IN ('upcoming', 'ongoing') AND s.end_time > clock_timestamp()
					AND d.status = 'scheduled' AND d.start_time > clock_timestamp()
					AND p.status IN ('registered', 'active') AND o.odds_value > 1,
					o.odds_value
				FROM division_participants p
				JOIN divisions d ON d.id = p.division_id
				JOIN shows s ON s.id = d.show_id
				JOIN odds o ON o.division_participant_id = p.id AND o.bet_type_id = $4
				JOIN bet_types bt ON bt.id = o.bet_type_id AND bt.name = 'win'
				WHERE p.id = $1 AND d.id = $2 AND s.id = $3
				FOR SHARE OF p, d, s, o`, selection.CompetitorId, selection.DivisionId,
				selection.ShowId, selection.BetTypeId).Scan(&open, &currentOdds)
			if errors.Is(err, sql.ErrNoRows) || (err == nil && !open) {
				return ErrMarketClosed
			}
			if err != nil {
				return err
			}
			if currentOdds != selection.Odds {
				return ErrOddsChanged
			}
		}
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

		var singularBets []SingularBet
		runningBalance := currentBalance

		// TODO: refactor to bulk insert singular bets and related transactions
		for _, bet := range betSlip.ActiveBets {
			singularBet, err := s.createSingularBet(ctx, tx, user, &bet, isAccumulator)
			if err != nil {
				return err
			}
			singularBets = append(singularBets, *singularBet)

			// Calculate balances for this specific transaction
			amount := bet.Amount
			if amount == nil {
				amount = new(float64) // Create a new float64 pointer with the default value 0.0
			}

			balanceAfter := runningBalance - *amount

			// Create transaction for singular bet
			err = s.createBetTransaction(ctx, tx, singularBet, runningBalance, balanceAfter, false)
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
			err = s.createBetTransaction(ctx, tx, accumulatorBet, runningBalance, balanceAfter, false)
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
	// Use provided transaction if available, otherwise use db
	// queryer := s.db
	// if tx != nil {
	//     queryer = tx
	// }

	query := `
		WITH division_bets AS (
		    -- Get singular bets that are components of accumulators for this division
		    SELECT
		        b.id,
		        b.user_id,
		        b.division_participant_id,
		        b.bet_type_id,
		        b.is_component,
		        b.amount,
		        b.currency_code,
		        b.odds_at_time,
		        b.potential_payout,
		        b.status,
		        abc.accumulator_bet_id
		    FROM
		        bets b
		        JOIN division_participants dp ON b.division_participant_id = dp.id
		        JOIN accumulator_bet_components abc ON b.id = abc.singular_bet_id
		    WHERE
		        dp.division_id = $1
		        AND b.status = 'pending'
		        AND b.settled_at IS NULL
		        AND b.cancelled_at IS NULL
		        AND b.is_component = TRUE
		),
		accumulator_bets AS (
		    -- Get accumulator bets that have components in this division
		    SELECT DISTINCT
		        acc.id,
		        acc.user_id,
		        acc.division_participant_id,
		        acc.bet_type_id,
		        acc.is_component,
		        acc.amount,
		        acc.currency_code,
		        acc.odds_at_time,
		        acc.potential_payout,
		        acc.status
		    FROM
		        bets acc
		        JOIN division_bets db ON db.accumulator_bet_id = acc.id
		    WHERE
		        acc.bet_type_id = 9999999999
		        AND acc.is_component = FALSE
		        AND acc.status = 'pending'
		        AND acc.settled_at IS NULL
		        AND acc.cancelled_at IS NULL
		)
		SELECT
		    id,
		    user_id,
		    division_participant_id,
		    bet_type_id,
		    is_component,
		    amount,
		    currency_code,
		    odds_at_time,
		    potential_payout,
		    status
		FROM (
		    -- Combine both standalone singular bets and accumulator bets
		    SELECT
		        *
		    FROM
		        accumulator_bets
		    UNION ALL
		    -- Get standalone singular bets (not components of accumulators)
		    SELECT
		        b.id,
		        b.user_id,
		        b.division_participant_id,
		        b.bet_type_id,
		        b.is_component,
		        b.amount,
		        b.currency_code,
		        b.odds_at_time,
		        b.potential_payout,
		        b.status
		    FROM
		        bets b
		        JOIN division_participants dp ON b.division_participant_id = dp.id
		    WHERE
		        dp.division_id = $1
		        AND b.status = 'pending'
		        AND b.settled_at IS NULL
		        AND b.cancelled_at IS NULL
		        AND b.is_component = FALSE
		        AND b.id NOT IN (
		            SELECT
		                accumulator_bet_id
		            FROM
		                accumulator_bet_components)) combined
		ORDER BY
		    id`

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
		var divisionParticipantID sql.NullString

		err := rows.Scan(
			&bet.ID,
			&bet.UserID,
			&divisionParticipantID,
			&bet.BetType,
			&bet.IsComponent,
			&bet.Amount,
			&bet.Currency,
			&bet.OddsAtTime,
			&bet.PotentialPayout,
			&bet.Status,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan bet row: %w", err)
		}

		if divisionParticipantID.Valid {
			bet.DivisionParticipantID = &divisionParticipantID.String
		}
		// if settledAt.Valid {
		// 	bet.SettledAt = &settledAt.String
		// }
		// if cancelledAt.Valid {
		// 	bet.CancelledAt = &cancelledAt.String
		// }

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

// TODO: add unit/integration tests for the functions below
func (s *BetsStore) SettleDivisionBets(ctx context.Context, settlement BetSettlement) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		// 1. Mark all component bets for this division as won/lost
		if err := s.markComponentBetsStatus(ctx, tx, settlement); err != nil {
			return fmt.Errorf("failed to mark component bets: %w", err)
		}

		// 2. Settle standalone bets and process payouts
		if err := s.settleStandaloneBets(ctx, tx); err != nil {
			return fmt.Errorf("failed to settle standalone bets: %w", err)
		}

		// 3. Find and settle ready accumulators
		if err := s.settleReadyAccumulators(ctx, tx, settlement); err != nil {
			return fmt.Errorf("failed to settle accumulators: %w", err)
		}

		// TODO: if anything errors out we need a way to record the error and the ability to address
		// the issue and re-run the function

		return nil
	})
}

func (s *BetsStore) markComponentBetsStatus(ctx context.Context, tx *sql.Tx, settlement BetSettlement) error {
	divisionParticipantIDs := make([]string, len(settlement.Outcomes))
	winningParticipantIDs := make([]string, 0)

	for i, outcome := range settlement.Outcomes {
		divisionParticipantIDs[i] = outcome.DivisionParticipantId
		if outcome.Position != nil && *outcome.Position == 1 {
			winningParticipantIDs = append(winningParticipantIDs, outcome.DivisionParticipantId)
		}
	}

	// First, update the component bets for this division
	componentQuery := `
		UPDATE
		    bets b
		SET
		    status = CASE WHEN b.division_participant_id = ANY ($2) THEN
		        'won'::bet_status
		    ELSE
		        'lost'::bet_status
		    END
		WHERE
		    b.division_participant_id IS NOT NULL -- Exclude bets without a valid division_participant_id (e.g., accumulators)
		    AND b.division_participant_id = ANY ($1) -- Only target bets linked to division participants in settlement
		    AND b.is_component = TRUE -- Ensure we target only component bets
		    AND b.status = 'pending'::bet_status -- Only update bets still pending
		RETURNING
		    id,
		    user_id,
		    status;
		`

	// Then, update accumulator bets only if all their components are settled
	accumulatorQuery := `
		WITH component_status AS (
		    -- Gather the status of all components for each accumulator
		    SELECT
		        abc.accumulator_bet_id,
		        COUNT(*) AS total_components,
		        COUNT(
		            CASE WHEN cb.status IN ('won', 'lost') THEN
		                1
		            END) AS settled_components,
		        COUNT(
		            CASE WHEN cb.status = 'pending' THEN
		                1
		            END) AS pending_components,
		        bool_and(cb.status = 'won') AS all_won
		    FROM
		        accumulator_bet_components abc
		        JOIN bets cb ON abc.singular_bet_id = cb.id
		    GROUP BY
		        abc.accumulator_bet_id)
		UPDATE
		    bets b
		SET
		    status = CASE WHEN cs.all_won THEN
		        'won'::bet_status
		    ELSE
		        'lost'::bet_status
		    END
		    -- , settled_at = NOW() TODO: do we need this?
		FROM
		    component_status cs
		WHERE
		    b.id = cs.accumulator_bet_id
		    -- Ensure accumulator is pending before updating
		    AND b.status = 'pending'::bet_status
		    -- Only update accumulators where all components are settled (no pending components)
		    AND cs.pending_components = 0
		    -- Ensure total settled components match the total number of components
		    AND cs.total_components = cs.settled_components
		RETURNING
		    b.id,
		    b.user_id,
		    b.status`

	_, err := tx.ExecContext(ctx, componentQuery,
		pq.Array(divisionParticipantIDs),
		pq.Array(winningParticipantIDs),
	)
	if err != nil {
		return fmt.Errorf("failed to update component bets: %w", err)
	}

	_, err = tx.ExecContext(ctx, accumulatorQuery)
	if err != nil {
		return fmt.Errorf("failed to update accumulator bets: %w", err)
	}

	return nil
}

func (s *BetsStore) updateBetSettledAt(ctx context.Context, tx *sql.Tx, betId uuid.UUID) error {
	result, err := tx.ExecContext(ctx, `
        UPDATE bets 
        SET settled_at = NOW() 
        WHERE id = $1`, betId)
	if err != nil {
		return fmt.Errorf("failed to update bet settled_at with ID of %v: %w", betId, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected for bet update: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("bet %s was not updated, possible concurrent modification", betId)
	}
	return nil
}

func (s *BetsStore) updateUserBalance(ctx context.Context, tx *sql.Tx, userId uuid.UUID, payout float64) (float64, error) {
	var currentBalance float64
	var userVersion int

	err := tx.QueryRow(`
        SELECT balance, version 
        FROM user_balances 
        WHERE user_id = $1 
        FOR UPDATE`, userId).Scan(&currentBalance, &userVersion)
	if err != nil {
		return 0, fmt.Errorf("failed to retrieve user balance: %w", err)
	}

	var newBalance float64
	err = tx.QueryRowContext(ctx, `
        WITH balance_update AS (
            UPDATE user_balances
            SET balance = balance + $1, version = version + 1
            WHERE user_id = $2 AND version = (
                SELECT version FROM user_balances WHERE user_id = $2 FOR UPDATE
            )
            RETURNING balance, version
        )
        SELECT balance, version FROM balance_update`,
		payout, userId).Scan(&newBalance, &userVersion)

	if err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("optimistic lock failed for user %s: concurrent modification detected", userId)
		}
		return 0, fmt.Errorf("failed to update balance for user %s: %w", userId, err)
	}

	return currentBalance, nil
}

// TODO: Figure out why doing the manual user_balances updates below work but using the updateUserBalance causes errors
func (s *BetsStore) processWinningBet(ctx context.Context, tx *sql.Tx, bet *SingularBet) error {
	// Get current balance with lock
	var currentBalance float64
	var userVersion int
	err := tx.QueryRow(`
        SELECT balance, version 
        FROM user_balances 
        WHERE user_id = $1 
        FOR UPDATE`, bet.UserId).Scan(&currentBalance, &userVersion)
	if err != nil {
		return fmt.Errorf("failed to retrieve user balance: %w", err)
	}

	// Calculate payout
	if bet.Amount == nil {
		return fmt.Errorf("bet amount is nil for bet %s", bet.Id)
	}

	payout := (*bet.Amount * bet.OddsAtTime) - *bet.Amount
	roundedPayout := currency.RoundCurrency(payout)
	if roundedPayout != bet.PotentialPayout {
		log.Printf("bet %v payout mismatch: calculated=%v, recorded=%v",
			bet.Id, roundedPayout, bet.PotentialPayout)
	}

	// Update balance with optimistic locking
	var newBalance float64
	err = tx.QueryRowContext(ctx, `
        WITH balance_update AS (
            UPDATE user_balances
            SET balance = balance + $1, 
                version = version + 1
            WHERE user_id = $2 
            AND version = (
                SELECT version 
                FROM user_balances 
                WHERE user_id = $2 
                FOR UPDATE
            )
            RETURNING balance, version
        )
        SELECT balance, version FROM balance_update`,
		bet.PotentialPayout, bet.UserId).Scan(&newBalance, &userVersion)

	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("optimistic lock failed for user %s: concurrent modification detected", bet.UserId)
		}
		return fmt.Errorf("failed to update balance for user %s: %w", bet.UserId, err)
	}

	balanceAfter := currentBalance + bet.PotentialPayout
	payoutBet := *bet
	payoutBet.Amount = &bet.PotentialPayout

	// Create transaction record
	if err := s.createBetTransaction(ctx, tx, &payoutBet, currentBalance, balanceAfter, true); err != nil {
		return err
	}

	return s.updateBetSettledAt(ctx, tx, bet.Id)
}

func (s *BetsStore) settleStandaloneBets(ctx context.Context, tx *sql.Tx) error {
	betResultsQuery := `
		SELECT
		    id,
		    user_id,
		    division_participant_id,
		    bet_type_id,
		    currency_code,
		    status,
		    amount,
		    odds_at_time,
		    potential_payout
		FROM
		    bets b
		WHERE
		    b.division_participant_id IS NOT NULL
		    AND b.bet_type_id != 9999999999
		    AND b.amount IS NOT NULL
        AND b.status IN ($1, $2)
		    AND b.settled_at IS NULL`

	betRows, err := tx.QueryContext(ctx, betResultsQuery, BetStatusWon, BetStatusLost)
	if err != nil {
		return fmt.Errorf("failed to update bets: %w", err)
	}
	defer betRows.Close()

	var bets []SingularBet
	for betRows.Next() {
		var br SingularBet
		if err := betRows.Scan(&br.Id, &br.UserId, &br.DivisionParticipantId, &br.BetTypeId, &br.CurrencyCode, &br.Status, &br.Amount, &br.OddsAtTime, &br.PotentialPayout); err != nil {
			return fmt.Errorf("failed to scan bet: %w", err)
		}
		bets = append(bets, br)
	}

	if err = betRows.Err(); err != nil {
		return fmt.Errorf("error iterating bets: %w", err)
	}

	for _, bet := range bets {
		switch bet.Status {
		case BetStatusWon:
			if err := s.processWinningBet(ctx, tx, &bet); err != nil {
				return err
			}
		case BetStatusLost:
			if err := s.updateBetSettledAt(ctx, tx, bet.Id); err != nil {
				return err
			}
		}
	}

	return nil
}

type AccumulatorBetResult struct {
	Bet              SingularBet
	AllComponentsWon bool
}

func (s *BetsStore) settleReadyAccumulators(ctx context.Context, tx *sql.Tx, settlement BetSettlement) error {
	query := `
        WITH accumulator_components_status AS (
            SELECT
                abc.accumulator_bet_id,
                COUNT(*) AS total_components,
                COUNT(CASE WHEN cb.status IN ('won', 'lost') THEN 1 END) AS settled_components,
                bool_and(cb.status = 'won') AS all_components_won,
                bool_and(cb.status IN ('won', 'lost')) AS all_components_settled
            FROM accumulator_bet_components abc
            JOIN bets cb ON abc.singular_bet_id = cb.id
            GROUP BY abc.accumulator_bet_id
        )
        SELECT 
            b.id, b.user_id, b.division_participant_id,
            b.bet_type_id, b.currency_code, b.status,
            b.amount, b.odds_at_time, b.potential_payout,
            acs.all_components_won
        FROM accumulator_bet_components abc
        JOIN bets b ON abc.accumulator_bet_id = b.id
        JOIN accumulator_components_status acs ON acs.accumulator_bet_id = abc.accumulator_bet_id
        WHERE EXISTS (
            SELECT 1 
            FROM bets b2
            JOIN division_participants dp2 ON b2.division_participant_id = dp2.id
            WHERE dp2.division_id = $1 AND b2.id = abc.singular_bet_id
        )
        AND b.status IN ('won', 'lost')
        AND acs.total_components = acs.settled_components
        AND acs.all_components_settled = TRUE
        GROUP BY 
            b.id, b.user_id, b.division_participant_id,
            b.bet_type_id, b.currency_code, b.status,
            b.amount, b.odds_at_time, b.potential_payout,
            acs.all_components_won`

	rows, err := tx.QueryContext(ctx, query, settlement.DivisionID)
	if err != nil {
		return fmt.Errorf("failed to execute settleable accumulators query: %w", err)
	}
	defer rows.Close()

	var results []AccumulatorBetResult
	for rows.Next() {
		var result AccumulatorBetResult
		if err := rows.Scan(
			&result.Bet.Id, &result.Bet.UserId, &result.Bet.DivisionParticipantId,
			&result.Bet.BetTypeId, &result.Bet.CurrencyCode, &result.Bet.Status,
			&result.Bet.Amount, &result.Bet.OddsAtTime, &result.Bet.PotentialPayout,
			&result.AllComponentsWon,
		); err != nil {
			return fmt.Errorf("failed to scan accumulator: %w", err)
		}
		results = append(results, result)
	}

	if err = rows.Err(); err != nil {
		return fmt.Errorf("error iterating accumulators: %w", err)
	}

	// Process each bet
	for _, result := range results {
		if result.AllComponentsWon {
			if err := s.processWinningBet(ctx, tx, &result.Bet); err != nil {
				return fmt.Errorf("failed to process winning accumulator bet %v: %w", result.Bet.Id, err)
			}
		} else {
			if err := s.updateBetSettledAt(ctx, tx, result.Bet.Id); err != nil {
				return fmt.Errorf("failed to update settled_at for accumulator bet %v: %w", result.Bet.Id, err)
			}
		}
	}

	return nil
}
