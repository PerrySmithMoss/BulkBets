package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type Division struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Category  *string   `json:"category"`
	Status    string    `json:"status"`
	StartTime time.Time `json:"start_time"`
}

type DivisionsStore struct {
	db *sql.DB
}

func NewDivisionsStore(db *sql.DB) *DivisionsStore {
	return &DivisionsStore{db: db}
}

func (s *DivisionsStore) GetDivisionByID(ctx context.Context, divisionId int, showId int) (*Division, error) {
	var division Division

	showQuery := `SELECT id, name, category, status, start_time
                    FROM divisions WHERE id = $1 AND show_id = $2`
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
