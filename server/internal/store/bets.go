package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
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
	if err := bets.ValidateAmounts(*betSlip); err != nil {
		return err
	}
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
	if len(betSlip.ActiveBets) > 1 && !isAccumulator {
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

			potentialPayout := currency.MultiplyAndRound(*betSlip.StakeMultiplier, betSlip.ActiveBets[0].Odds)
			betSlip.ActiveBets[0].PotentialPayout = &potentialPayout

			// Reset StakeMultiplier to 0
			zero := 0.0
			betSlip.StakeMultiplier = &zero
		}
	}

	totalStake := bets.CalculateTotalStake(*betSlip)

	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		// Serialize placement, demo settlement and reset for this visitor.
		var isDemo bool
		if err := tx.QueryRowContext(ctx, `SELECT is_demo FROM users WHERE id = $1 FOR UPDATE`, user.Id).Scan(&isDemo); err != nil {
			return err
		}
		// Validate against authoritative rows in the same transaction as the debit.
		// Shared locks prevent settlement/status/price changes until this bet commits.
		for _, selection := range betSlip.ActiveBets {
			var open bool
			var currentOdds float64
			err := tx.QueryRowContext(ctx, `
				SELECT (($5 AND s.owner_id IS NULL) OR (s.status IN ('upcoming', 'ongoing') AND s.end_time > clock_timestamp()
					AND d.status = 'scheduled' AND d.start_time > clock_timestamp()))
					AND (s.owner_id IS NULL OR s.owner_id = $6)
					AND (p.status IN ('registered', 'active') OR ($5 AND p.status = 'fulfilled')) AND o.odds_value > 1,
					o.odds_value
				FROM division_participants p
				JOIN divisions d ON d.id = p.division_id
				JOIN shows s ON s.id = d.show_id
				JOIN odds o ON o.division_participant_id = p.id AND o.bet_type_id = $4
				JOIN bet_types bt ON bt.id = o.bet_type_id AND bt.name = 'win'
				WHERE p.id = $1 AND d.id = $2 AND s.id = $3
				FOR SHARE OF p, d, s, o`, selection.CompetitorId, selection.DivisionId,
				selection.ShowId, selection.BetTypeId, isDemo, user.Id).Scan(&open, &currentOdds)
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
			return ErrInsufficientFunds
		}

		//  Update balance with optimistic locking
		newBalance := math.Round((currentBalance-totalStake)*100) / 100
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

			balanceAfter := math.Round((runningBalance-*amount)*100) / 100

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
			balanceAfter := math.Round((runningBalance-multiplier)*100) / 100

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
		WITH selected_bets AS (
            SELECT b.id FROM bets b
            LEFT JOIN division_participants dp ON dp.id = b.division_participant_id
            LEFT JOIN divisions d ON d.id = dp.division_id
            LEFT JOIN shows s ON s.id = d.show_id
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
		            b.status::TEXT IN ('won', 'lost', 'void', 'cancelled')
		        ELSE
		            b.status::TEXT = ANY ($2) -- Cast status to text for comparison
		        END)
		    AND b.amount > 0
            ORDER BY b.created_at DESC, b.id
            LIMIT $3 OFFSET $4
        ), bet_components AS (
		    SELECT
		        abc.accumulator_bet_id,
		        ARRAY_AGG(abc.singular_bet_id ORDER BY abc.singular_bet_id) AS component_ids
		    FROM
		        accumulator_bet_components abc
		    GROUP BY
		        abc.accumulator_bet_id
		)
		SELECT
		    b.id,
		    b.division_participant_id,
		    b.bet_type_id,
		    COALESCE(b.amount, 0),
		    b.currency_code,
		    b.odds_at_time,
		    COALESCE(b.potential_payout, 0),
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
        WHERE b.user_id = $1 AND (
            b.id IN (SELECT id FROM selected_bets) OR b.id IN (
                SELECT singular_bet_id FROM accumulator_bet_components WHERE accumulator_bet_id IN (SELECT id FROM selected_bets)
            )
        )
        ORDER BY b.created_at DESC, b.id;
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
