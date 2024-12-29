package store

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
)

type Odds struct {
	BetTypeId int64   `json:"bet_type_id"`
	BetType   string  `json:"bet_type"`
	OddsValue float64 `json:"odds_value"`
}

type OddsStore struct {
	db *sql.DB
}

func NewOddsStore(db *sql.DB) *OddsStore {
	return &OddsStore{db: db}
}

type OddsKey struct {
	CompetitorId string
	BetTypeId    int64
}

func (r *OddsStore) FetchOdds(ctx context.Context, keys []OddsKey) (map[OddsKey]float64, error) {
	// Early return for empty input
	if len(keys) == 0 {
		return nil, nil
	}

	// Deduplicate keys
	uniqueKeys := map[OddsKey]struct{}{}
	for _, key := range keys {
		uniqueKeys[key] = struct{}{}
	}

	competitorIds := []string{}
	betTypes := []int64{}
	for key := range uniqueKeys {
		competitorIds = append(competitorIds, key.CompetitorId)
		betTypes = append(betTypes, key.BetTypeId)
	}

	// SQL query
	query := `
        SELECT division_participant_id, bet_type_id, odds_value
        FROM odds
        WHERE division_participant_id = ANY($1) AND bet_type_id = ANY($2)
    `

	// Execute query
	rows, err := r.db.QueryContext(ctx, query, pq.Array(competitorIds), pq.Array(betTypes))
	if err != nil {
		return nil, fmt.Errorf("FetchOdds query failed: %w", err)
	}
	defer rows.Close()

	// Populate result map
	result := make(map[OddsKey]float64)
	for rows.Next() {
		var CompetitorId string
		var betType int64
		var oddsValue float64

		if err := rows.Scan(&CompetitorId, &betType, &oddsValue); err != nil {
			return nil, fmt.Errorf("FetchOdds row scan failed: %w", err)
		}

		key := OddsKey{
			CompetitorId: CompetitorId,
			BetTypeId:    betType,
		}
		result[key] = oddsValue
	}

	// Handle any errors from iteration
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FetchOdds row iteration error: %w", err)
	}

	return result, nil
}
