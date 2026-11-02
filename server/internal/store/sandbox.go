package store

import (
	"context"
	"database/sql"
	"errors"
	"github.com/lib/pq"
	"math"
	"strings"
	"time"
	"unicode/utf8"
)

type SandboxCompetitor struct {
	FirstName   string  `json:"first_name"`
	LastName    string  `json:"last_name"`
	Nationality string  `json:"nationality"`
	Odds        float64 `json:"odds"`
}
type SandboxShowInput struct {
	Name        string              `json:"name"`
	Division    string              `json:"division"`
	Competitors []SandboxCompetitor `json:"competitors"`
}
type SandboxEdit struct {
	Operation     string            `json:"operation"`
	Name          string            `json:"name"`
	DivisionID    int64             `json:"division_id"`
	ParticipantID string            `json:"participant_id"`
	Competitor    SandboxCompetitor `json:"competitor"`
}
type SettlementPreview struct {
	SettledBets int      `json:"settled_bets"`
	Payout      float64  `json:"payout"`
	Winners     []string `json:"winners"`
}

func validMode(mode string) bool { return mode == "favourite" || mode == "upset" || mode == "void" }
func validName(name string) bool {
	return strings.TrimSpace(name) != "" && utf8.RuneCountInString(name) <= 100
}
func validCompetitor(c SandboxCompetitor) bool {
	return validName(c.FirstName) && validName(c.LastName) && utf8.RuneCountInString(c.FirstName) <= 50 && utf8.RuneCountInString(c.LastName) <= 50 && utf8.RuneCountInString(c.Nationality) <= 50 && !math.IsNaN(c.Odds) && !math.IsInf(c.Odds, 0) && c.Odds > 1 && c.Odds <= 100 && math.Abs(c.Odds*100-math.Round(c.Odds*100)) < 0.000001
}

func addSandboxCompetitor(ctx context.Context, tx *sql.Tx, userID string, divisionID int64, c SandboxCompetitor) error {
	if !validCompetitor(c) {
		return ErrInvalidInput
	}
	var count int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM division_participants WHERE division_id=$1`, divisionID).Scan(&count); err != nil {
		return err
	}
	if count >= 20 {
		return ErrInvalidInput
	}
	var athlete, participant string
	if err := tx.QueryRowContext(ctx, `INSERT INTO athletes (first_name,last_name,nationality,meta_data) VALUES ($1,$2,$3,jsonb_build_object('sandbox_owner',$4::text)) RETURNING id`, strings.TrimSpace(c.FirstName), strings.TrimSpace(c.LastName), c.Nationality, userID).Scan(&athlete); err != nil {
		return err
	}
	if err := tx.QueryRowContext(ctx, `INSERT INTO division_participants (division_id,athlete_id) VALUES ($1,$2) RETURNING id`, divisionID, athlete).Scan(&participant); err != nil {
		return err
	}
	_, err := tx.ExecContext(ctx, `INSERT INTO odds (division_participant_id,bet_type_id,odds_value,created_by) SELECT $1,id,$2,$3 FROM bet_types WHERE name='win'`, participant, c.Odds, userID)
	return err
}

func (s *DemoStore) CreateSandboxShow(ctx context.Context, userID string, input SandboxShowInput) (int64, error) {
	if !validName(input.Name) || !validName(input.Division) || len(input.Competitors) < 2 || len(input.Competitors) > 20 {
		return 0, ErrInvalidInput
	}
	for _, c := range input.Competitors {
		if !validCompetitor(c) {
			return 0, ErrInvalidInput
		}
	}
	var id int64
	err := withTx(s.db, ctx, func(tx *sql.Tx) error {
		if err := lockDemo(ctx, tx, userID); err != nil {
			return err
		}
		var count int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM shows WHERE owner_id=$1`, userID).Scan(&count); err != nil {
			return err
		}
		if count >= 10 {
			return ErrInvalidInput
		}
		if err := tx.QueryRowContext(ctx, `INSERT INTO shows (name,location,is_two_day_show,start_time,end_time,owner_id)
    VALUES ($1,'Private demo arena',false,NOW()+INTERVAL '7 days',NOW()+INTERVAL '8 days',$2) RETURNING id`, strings.TrimSpace(input.Name), userID).Scan(&id); err != nil {
			return err
		}
		var division int64
		if err := tx.QueryRowContext(ctx, `INSERT INTO divisions (show_id,name,start_time) VALUES ($1,$2,NOW()+INTERVAL '7 days') RETURNING id`, id, strings.TrimSpace(input.Division)).Scan(&division); err != nil {
			return err
		}
		for _, c := range input.Competitors {
			if err := addSandboxCompetitor(ctx, tx, userID, division, c); err != nil {
				return err
			}
		}
		return nil
	})
	return id, err
}

func ownedShow(ctx context.Context, tx *sql.Tx, userID string, showID int64) (string, error) {
	var status string
	err := tx.QueryRowContext(ctx, `SELECT status FROM shows WHERE id=$1 AND owner_id=$2 FOR UPDATE`, showID, userID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return status, err
}

func (s *DemoStore) EditSandbox(ctx context.Context, userID string, showID int64, input SandboxEdit) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		if err := lockDemo(ctx, tx, userID); err != nil {
			return err
		}
		status, err := ownedShow(ctx, tx, userID, showID)
		if err != nil {
			return err
		}
		if status != "upcoming" {
			return ErrConflict
		}
		switch input.Operation {
		case "rename":
			if !validName(input.Name) {
				return ErrInvalidInput
			}
			_, err = tx.ExecContext(ctx, `UPDATE shows SET name=$1 WHERE id=$2`, strings.TrimSpace(input.Name), showID)
		case "suspend", "reopen":
			state := "ongoing"
			if input.Operation == "reopen" {
				state = "scheduled"
			}
			_, err = tx.ExecContext(ctx, `UPDATE divisions SET status=$1 WHERE show_id=$2`, state, showID)
		case "add_division":
			if !validName(input.Name) {
				return ErrInvalidInput
			}
			var count int
			if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM divisions WHERE show_id=$1`, showID).Scan(&count); err != nil {
				return err
			}
			if count >= 8 {
				return ErrInvalidInput
			}
			_, err = tx.ExecContext(ctx, `INSERT INTO divisions (show_id,name,start_time) VALUES ($1,$2,NOW()+INTERVAL '7 days')`, showID, strings.TrimSpace(input.Name))
		case "add_competitor", "update_competitor", "set_winner":
			var division int64
			if err := tx.QueryRowContext(ctx, `SELECT id FROM divisions WHERE id=$1 AND show_id=$2`, input.DivisionID, showID).Scan(&division); err != nil {
				return ErrNotFound
			}
			if input.Operation == "add_competitor" {
				return addSandboxCompetitor(ctx, tx, userID, division, input.Competitor)
			}
			var athlete string
			if err := tx.QueryRowContext(ctx, `SELECT athlete_id FROM division_participants WHERE id=$1 AND division_id=$2`, input.ParticipantID, division).Scan(&athlete); err != nil {
				return ErrNotFound
			}
			if input.Operation == "set_winner" {
				_, err = tx.ExecContext(ctx, `UPDATE division_participants SET final_position=CASE WHEN id=$1 THEN 1 ELSE NULL END WHERE division_id=$2`, input.ParticipantID, division)
				return err
			}
			if !validCompetitor(input.Competitor) {
				return ErrInvalidInput
			}
			c := input.Competitor
			if _, err = tx.ExecContext(ctx, `UPDATE athletes SET first_name=$1,last_name=$2,nationality=$3 WHERE id=$4`, strings.TrimSpace(c.FirstName), strings.TrimSpace(c.LastName), c.Nationality, athlete); err != nil {
				return err
			}
			_, err = tx.ExecContext(ctx, `WITH previous AS (SELECT id,odds_value FROM odds WHERE division_participant_id=$2 FOR UPDATE),
 changed AS (UPDATE odds o SET odds_value=$1,updated_at=NOW() FROM previous p WHERE o.id=p.id RETURNING o.id,p.odds_value)
 INSERT INTO odds_history (odds_id,previous_value,new_value,changed_by) SELECT id,odds_value,$1,$3 FROM changed`, c.Odds, input.ParticipantID, userID)
		default:
			return ErrInvalidInput
		}
		return err
	})
}

func simulationSelections(ctx context.Context, tx *sql.Tx, userID string, showID int64, mode string) ([]int64, []string, error) {
	// showID=0 deliberately excludes private events: global replay must never bypass
	// an event's closed market or pay its bets before the event finishes.
	rows, err := tx.QueryContext(ctx, `SELECT d.id,p.id FROM divisions d JOIN shows s ON s.id=d.show_id
 JOIN LATERAL (SELECT p.id FROM division_participants p JOIN odds o ON o.division_participant_id=p.id
 JOIN bet_types bt ON bt.id=o.bet_type_id AND bt.name='win'
 WHERE p.division_id=d.id AND p.status IN ('registered','active','fulfilled') AND o.odds_value>1
 ORDER BY (p.final_position=1 AND s.owner_id IS NOT NULL) DESC NULLS LAST,
 CASE WHEN $3='upset' THEN -o.odds_value ELSE o.odds_value END,p.id LIMIT 1) p ON TRUE
 WHERE ($2=0 AND s.owner_id IS NULL) OR (s.id=$2 AND s.owner_id=$1) ORDER BY d.id`, userID, showID, mode)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	divisions := []int64{}
	winners := []string{}
	for rows.Next() {
		var d int64
		var p string
		if err := rows.Scan(&d, &p); err != nil {
			return nil, nil, err
		}
		divisions = append(divisions, d)
		winners = append(winners, p)
	}
	return divisions, winners, rows.Err()
}

func (s *DemoStore) PreviewSandbox(ctx context.Context, userID string, showID int64, mode string) (*SettlementPreview, error) {
	if !validMode(mode) {
		return nil, ErrInvalidInput
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if err := lockDemo(ctx, tx, userID); err != nil {
		return nil, err
	}
	if _, err := ownedShow(ctx, tx, userID, showID); err != nil {
		return nil, err
	}
	divisions, winners, err := simulationSelections(ctx, tx, userID, showID, mode)
	if err != nil {
		return nil, err
	}
	result, err := settleUserTx(ctx, tx, userID, divisions, winners, mode == "void")
	if err != nil {
		return nil, err
	}
	return &SettlementPreview{SettledBets: result.SettledBets, Payout: result.Payout, Winners: winners}, nil
}

func (s *DemoStore) RunSandbox(ctx context.Context, userID string, showID int64, mode string) error {
	if !validMode(mode) {
		return ErrInvalidInput
	}
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		if err := lockDemo(ctx, tx, userID); err != nil {
			return err
		}
		status, err := ownedShow(ctx, tx, userID, showID)
		if err != nil {
			return err
		}
		if status != "upcoming" {
			return ErrConflict
		}
		var empty int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM divisions d WHERE show_id=$1 AND
   (SELECT COUNT(*) FROM division_participants p WHERE p.division_id=d.id)<2`, showID).Scan(&empty); err != nil {
			return err
		}
		if empty > 0 && mode != "void" {
			return ErrInvalidInput
		}
		if _, err := tx.ExecContext(ctx, `UPDATE divisions SET status='ongoing' WHERE show_id=$1`, showID); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE shows SET status='ongoing',settle_at=NOW()+INTERVAL '5 seconds',simulation_mode=$2 WHERE id=$1`, showID, mode)
		return err
	})
}

// Due events live in Postgres, so an API restart resumes unfinished events.
func (s *DemoStore) Maintain(ctx context.Context) error {
	s.maintenanceMu.Lock()
	defer s.maintenanceMu.Unlock()
	rows, err := s.db.QueryContext(ctx, `SELECT id,owner_id::text FROM shows WHERE owner_id IS NOT NULL AND settle_at<=NOW() AND status='ongoing' ORDER BY settle_at LIMIT 20`)
	if err != nil {
		return err
	}
	type due struct {
		id   int64
		user string
	}
	var events []due
	for rows.Next() {
		var e due
		if err := rows.Scan(&e.id, &e.user); err != nil {
			rows.Close()
			return err
		}
		events = append(events, e)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, event := range events {
		err := withTx(s.db, ctx, func(tx *sql.Tx) error {
			if err := lockDemo(ctx, tx, event.user); err != nil {
				return err
			}
			status, err := ownedShow(ctx, tx, event.user, event.id)
			if err != nil {
				return err
			}
			if status != "ongoing" {
				return nil
			}
			var mode string
			if err := tx.QueryRowContext(ctx, `SELECT simulation_mode FROM shows WHERE id=$1`, event.id).Scan(&mode); err != nil {
				return err
			}
			divisions, winners, err := simulationSelections(ctx, tx, event.user, event.id, mode)
			if err != nil {
				return err
			}
			if _, err := settleUserTx(ctx, tx, event.user, divisions, winners, mode == "void"); err != nil {
				return err
			}
			if mode != "void" {
				if _, err := tx.ExecContext(ctx, `UPDATE division_participants SET final_position=CASE WHEN id=ANY($2) THEN 1 ELSE NULL END WHERE division_id IN (SELECT id FROM divisions WHERE show_id=$1)`, event.id, pq.Array(winners)); err != nil {
					return err
				}
			} else {
				if _, err := tx.ExecContext(ctx, `UPDATE division_participants SET final_position=NULL WHERE division_id IN (SELECT id FROM divisions WHERE show_id=$1)`, event.id); err != nil {
					return err
				}
			}
			state, divisionState := "completed", "completed"
			if mode == "void" {
				state, divisionState = "canceled", "canceled"
			}
			if _, err := tx.ExecContext(ctx, `UPDATE divisions SET status=$2 WHERE show_id=$1`, event.id, divisionState); err != nil {
				return err
			}
			_, err = tx.ExecContext(ctx, `UPDATE shows SET status=$2,settle_at=NULL WHERE id=$1`, event.id, state)
			return err
		})
		if err != nil && !errors.Is(err, ErrNotFound) {
			return err
		}
	}
	if time.Since(s.lastCleanup) < time.Hour {
		return nil
	}
	if err := s.cleanupGuests(ctx); err != nil {
		return err
	}
	s.lastCleanup = time.Now()
	return nil
}

func (s *DemoStore) cleanupGuests(ctx context.Context) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		rows, err := tx.QueryContext(ctx, `SELECT id::text FROM users WHERE is_demo AND password_hash IS NULL AND google_id IS NULL
   AND github_id IS NULL AND x_id IS NULL AND email LIKE '%@demo.bulkbets.invalid' AND last_seen_at<NOW()-INTERVAL '30 days' LIMIT 100 FOR UPDATE SKIP LOCKED`)
		if err != nil {
			return err
		}
		var ids []string
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err != nil {
				rows.Close()
				return err
			}
			ids = append(ids, id)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return err
		}
		for _, id := range ids {
			for _, q := range []string{`DELETE FROM wallet_requests WHERE user_id=$1`, `DELETE FROM transactions WHERE user_id=$1`, `DELETE FROM users WHERE id=$1`, `DELETE FROM athletes WHERE meta_data->>'sandbox_owner'=$1 AND NOT EXISTS (SELECT 1 FROM division_participants WHERE athlete_id=athletes.id)`} {
				if _, err := tx.ExecContext(ctx, q, id); err != nil {
					return err
				}
			}
		}
		return nil
	})
}
