package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"time"
)

type Show struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Location    *string   `json:"location"`
	IsTwoDay    bool      `json:"is_two_day_show"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Status      string    `json:"status"`
}

// Response structure
type ShowDetails struct {
	Show        Show                   `json:"show"`
	Divisions   []Division             `json:"divisions"`
	Competitors map[int64][]Competitor `json:"competitors"` // Keyed by division ID
}

type ShowsStore struct {
	db *sql.DB
}

func NewShowsStore(db *sql.DB) *ShowsStore {
	return &ShowsStore{db: db}
}

func (s *ShowsStore) GetShowByID(ctx context.Context, showId int) (*ShowDetails, error) {
	var show Show
	divisions := make([]Division, 0)
	competitors := make(map[int64][]Competitor)

	// Query: Fetch Show details
	showQuery := `SELECT id, name, description, location, is_two_day_show, start_time, end_time, status 
                    FROM shows WHERE id = $1`
	err := s.db.QueryRow(showQuery, showId).Scan(
		&show.ID, &show.Name, &show.Description, &show.Location,
		&show.IsTwoDay, &show.StartTime, &show.EndTime, &show.Status,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	// Query: Fetch Divisions for the show
	divisionsQuery := `SELECT id, name, category, status, start_time 
                        FROM divisions WHERE show_id = $1`
	rows, err := s.db.Query(divisionsQuery, showId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var division Division
		if err := rows.Scan(&division.ID, &division.Name, &division.Category,
			&division.Status, &division.StartTime); err != nil {
			log.Printf("Error scanning division: %v", err)
			continue
		}
		divisions = append(divisions, division)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Query: Fetch Competitors with Odds for each division
	competitorsQuery := `SELECT 
		dp.id, 
		a.first_name, 
		a.last_name, 
		a.residency, 
		a.nationality, 
		a.country_code, 
		a.date_of_birth, 
		a.gender, 
		dp.pre_judge_score, 
		dp.pre_judge_position, 
		dp.final_score, 
		dp.final_position,
        dp.status,
			(
				SELECT jsonb_agg(
					jsonb_build_object(
					'bet_type_id', bt.id, 
					'bet_type', bt.name, 
					'odds_value', o.odds_value
					)
				) 
				FROM odds o
				JOIN bet_types bt ON o.bet_type_id = bt.id
				WHERE o.division_participant_id = dp.id
			) AS odds
		FROM division_participants dp
		INNER JOIN athletes a ON dp.athlete_id = a.id
		WHERE dp.division_id = $1`

	for _, division := range divisions {
		rows, err := s.db.Query(competitorsQuery, division.ID)
		if err != nil {
			log.Printf("Error fetching competitors for division %d: %v", division.ID, err)
			continue
		}
		defer rows.Close()

		divisionCompetitors := make([]Competitor, 0)
		for rows.Next() {
			var competitor Competitor
			var oddsJSON []byte
			if err := rows.Scan(
				&competitor.ID, &competitor.FirstName, &competitor.LastName,
				&competitor.Residency, &competitor.Nationality, &competitor.CountryCode,
				&competitor.DateOfBirth, &competitor.Gender,
				&competitor.PreJudgeScore, &competitor.PreJudgePosition,
				&competitor.FinalScore, &competitor.FinalPosition,
				&competitor.Status,
				&oddsJSON,
			); err != nil {
				log.Printf("Error scanning competitor: %v", err)
				continue
			}

			// Parse odds JSON
			if oddsJSON != nil {
				if err := json.Unmarshal(oddsJSON, &competitor.Odds); err != nil {
					log.Printf("Error unmarshaling odds: %v", err)
				}
			}

			divisionCompetitors = append(divisionCompetitors, competitor)
		}
		competitors[division.ID] = divisionCompetitors

		if err := rows.Err(); err != nil {
			log.Printf("Error after iterating competitors for division %d: %v", division.ID, err)
		}
	}

	return &ShowDetails{
		Show:        show,
		Divisions:   divisions,
		Competitors: competitors,
	}, nil
}

// ListShows returns the next scheduled shows followed by the most recent archive.
func (s *ShowsStore) ListShows(ctx context.Context) ([]Show, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, description, location, is_two_day_show, start_time, end_time, status FROM shows
 ORDER BY CASE WHEN end_time > NOW() AND status IN ('upcoming', 'ongoing') THEN 0 ELSE 1 END,
 CASE WHEN end_time > NOW() AND status IN ('upcoming', 'ongoing') THEN start_time END ASC, start_time DESC LIMIT 20`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	shows := make([]Show, 0)
	for rows.Next() {
		var show Show
		if err := rows.Scan(&show.ID, &show.Name, &show.Description, &show.Location, &show.IsTwoDay, &show.StartTime, &show.EndTime, &show.Status); err != nil {
			return nil, err
		}
		shows = append(shows, show)
	}
	return shows, rows.Err()
}
