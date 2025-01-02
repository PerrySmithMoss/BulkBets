package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/PerrySmithMoss/BulkBets/server/internal/integer"
	"github.com/google/uuid"
)

type ResultStatus string

const (
	ResultStatusFinished  ResultStatus = "finished"
	ResultStatusCancelled ResultStatus = "disqualified"
	ResultStatusDNF       ResultStatus = "DNF"
	ResultStatusNotScored ResultStatus = "not scored"
)

type Division struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Category  *string   `json:"category"`
	Status    string    `json:"status"`
	StartTime time.Time `json:"start_time"`
}

type DivisionResult struct {
	ID          int64     `json:"id"`
	DivisionId  int64     `json:"division_id"`
	FinalisedAt time.Time `json:"finalised_at"`
	FinalisedBy string    `json:"finalised_by"`
	Comments    *string   `json:"comments"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type DivisionResultOutcome struct {
	ID                    int64         `json:"id"`
	DivisionResultId      int64         `json:"division_result_id"`
	DivisionParticipantId string        `json:"division_participant_id"`
	Position              *int8         `json:"position"`
	Score                 *int8         `json:"score"`
	ResultStatus          *ResultStatus `json:"result_status"`
	Comments              *string       `json:"comments"`
	CreatedAt             time.Time     `json:"created_at"`
	CreatedBy             *string       `json:"created_by"`
}

type DivisionsStore struct {
	db *sql.DB
}

func NewDivisionsStore(db *sql.DB) *DivisionsStore {
	return &DivisionsStore{db: db}
}

func (s *DivisionsStore) GetDivisionByID(ctx context.Context, divisionId int, showId int) (*Division, error) {
	var division Division

	showQuery := `
		SELECT
		    id,
		    name,
		    category,
		    status,
		    start_time
		FROM
		    divisions
		WHERE
		    id = $1
		    AND show_id = $2`
	err := s.db.QueryRow(showQuery, divisionId, showId).Scan(
		&division.ID, &division.Name, &division.Category, &division.Status,
		&division.StartTime,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &Division{
		ID:        division.ID,
		Name:      division.Name,
		Category:  division.Category,
		Status:    division.Status,
		StartTime: division.StartTime,
	}, nil
}

type DivisionResultParams struct {
	DivisionId int64   `json:"division_id"`
	Comments   *string `json:"comments"`
}

func (s *DivisionsStore) CreateDivisionResult(ctx context.Context, params DivisionResultParams, userId uuid.UUID) (int64, error) {
	var resultID int64
	query := `
		INSERT INTO division_results (division_id, finalised_by, comments)
		    VALUES ($1, $2, $3)
			Returning id`

	err := s.db.QueryRowContext(ctx, query, params.DivisionId, userId, params.Comments).Scan(&resultID)
	if err != nil {
		return 0, fmt.Errorf("failed to create division result: %w", err)
	}

	return resultID, nil
}

type DivisionOutcome struct {
	ID                    int64         `json:"id"`
	DivisionResultId      int64         `json:"division_result_id"`
	DivisionParticipantId string        `json:"division_participant_id"`
	Position              *int8         `json:"position"`
	Score                 *int8         `json:"score"`
	ResultStatus          *ResultStatus `json:"result_status"`
	Comments              *string       `json:"comments"`
}

func (s *DivisionsStore) CreateDivisionResultOutcomes(ctx context.Context, outcomes []DivisionOutcome, userId uuid.UUID) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		query := `
            INSERT INTO division_result_outcomes (division_result_id, division_participant_id, position, score, result_status, comments)
                VALUES
                    %s`

		var valueStrings []string
		var valueArgs []interface{}

		for i, outcome := range outcomes {
			// Create a new string for each nil status
			if outcome.ResultStatus == nil {
				status := ResultStatusFinished
				outcome.ResultStatus = &status
			}

			valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d)",
				i*6+1, i*6+2, i*6+3, i*6+4, i*6+5, i*6+6))
			valueArgs = append(valueArgs,
				outcome.DivisionResultId,
				outcome.DivisionParticipantId,
				integer.DerefInt8(outcome.Position),
				integer.DerefInt8(outcome.Score),
				outcome.ResultStatus,
				outcome.Comments,
			)
		}

		query = fmt.Sprintf(query, strings.Join(valueStrings, ","))

		if _, err := tx.ExecContext(ctx, query, valueArgs...); err != nil {
			return fmt.Errorf("failed to batch-insert outcomes: %w", err)
		}

		return nil
	})
}
