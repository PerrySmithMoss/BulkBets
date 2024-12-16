package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
)

type Show struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Location    *string `json:"location"`
	IsTwoDay    bool    `json:"is_two_day_show"`
	StartTime   string  `json:"start_time"`
	EndTime     string  `json:"end_time"`
	Status      string  `json:"status"`
}

type Division struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	Category  *string `json:"category"`
	Status    string  `json:"status"`
	StartTime string  `json:"start_time"`
}

type Odds struct {
	BetTypeId int64   `json:"bet_type_id"`
	BetType   string  `json:"bet_type"`
	OddsValue float64 `json:"odds_value"`
}

type Competitor struct {
	ID               string  `json:"id"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	Residency        *string `json:"residency"`
	Nationality      *string `json:"nationality"`
	CountryCode      *string `json:"country_code"`
	DateOfBirth      *string `json:"date_of_birth"`
	Gender           *string `json:"gender"`
	PreJudgeScore    *int    `json:"pre_judge_score"`
	PreJudgePosition *int    `json:"pre_judge_position"`
	FinalScore       *int    `json:"final_score"`
	FinalPosition    *int    `json:"final_position"`
	Odds             []Odds  `json:"odds"`
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
	var divisions []Division
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

		var divisionCompetitors []Competitor
		for rows.Next() {
			var competitor Competitor
			var oddsJSON []byte
			if err := rows.Scan(
				&competitor.ID, &competitor.FirstName, &competitor.LastName,
				&competitor.Residency, &competitor.Nationality, &competitor.CountryCode,
				&competitor.DateOfBirth, &competitor.Gender,
				&competitor.PreJudgeScore, &competitor.PreJudgePosition,
				&competitor.FinalScore, &competitor.FinalPosition,
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
