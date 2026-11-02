package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

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
	DivisionId int64                   `json:"division_id"`
	Comments   *string                 `json:"comments"`
	Results    []DivisionOutcomeParams `json:"results"`
}

type DivisionOutcomeParams struct {
	DivisionResultId      int64         `json:"division_result_id"`
	DivisionParticipantId string        `json:"division_participant_id"`
	Position              *int8         `json:"position"`
	Score                 *int8         `json:"score"`
	ResultStatus          *ResultStatus `json:"result_status"`
	Comments              *string       `json:"comments"`
}

func (s *DivisionsStore) CreateDivisionResult(ctx context.Context, params DivisionResultParams, userID uuid.UUID) (int64, error) {
	return NewBetsStore(s.db).PublishDivisionResult(ctx, params, userID)
}
