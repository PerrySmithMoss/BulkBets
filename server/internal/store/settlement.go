package store

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"sort"

	"github.com/PerrySmithMoss/BulkBets/server/internal/currency"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type BetSettlement struct {
	DivisionID       int64
	DivisionResultID int64
	Outcomes         []DivisionOutcomeParams
}

func creditSettlement(ctx context.Context, tx *sql.Tx, userID, betID, kind string, payout float64) error {
	cents := int64(math.Round(payout * 100))
	if cents <= 0 {
		return nil
	}
	var before, after string
	if err := tx.QueryRowContext(ctx, `UPDATE user_balances SET balance=balance+$1::numeric/100,version=version+1
 WHERE user_id=$2 RETURNING (balance-$1::numeric/100)::text,balance::text`, cents, userID).Scan(&before, &after); err != nil {
		return err
	}
	_, err := tx.ExecContext(ctx, `INSERT INTO transactions (user_id,amount,currency_code,balance_before,balance_after,transaction_type,reference_id,status)
 VALUES ($1,$2::numeric/100,'GBP',$3,$4,$5,$6,'completed')`, userID, cents, before, after, kind, betID)
	return err
}

// Callers hold the user row lock before changing bet state. Claiming pending rows,
// writing the credit and the receipt in one transaction makes replay safe.
func settleUserTx(ctx context.Context, tx *sql.Tx, userID string, divisions []int64, winners []string, void bool) (*DemoSettlement, error) {
	result := &DemoSettlement{}
	rows, err := tx.QueryContext(ctx, `UPDATE bets b SET status=CASE WHEN $4 THEN 'void'::bet_status
 WHEN b.division_participant_id=ANY($3) THEN 'won'::bet_status ELSE 'lost'::bet_status END,settled_at=NOW()
 FROM division_participants p WHERE p.id=b.division_participant_id AND p.division_id=ANY($2)
 AND b.user_id=$1 AND b.status='pending' AND b.settled_at IS NULL
 RETURNING b.id,COALESCE(b.amount,0),COALESCE(b.potential_payout,0),b.status`, userID, pq.Array(divisions), pq.Array(winners), void)
	if err != nil {
		return nil, err
	}
	type item struct {
		id, status     string
		amount, payout float64
	}
	var singles []item
	for rows.Next() {
		var b item
		if err := rows.Scan(&b.id, &b.amount, &b.payout, &b.status); err != nil {
			rows.Close()
			return nil, err
		}
		singles = append(singles, b)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	pay := func(b item) error {
		if b.amount <= 0 {
			return nil
		}
		result.SettledBets++
		if b.status == "lost" {
			return nil
		}
		kind := "BET_PAYOUT"
		if b.status == "void" {
			b.payout = b.amount
			kind = "BET_REFUND"
		}
		if err := creditSettlement(ctx, tx, userID, b.id, kind, b.payout); err != nil {
			return err
		}
		result.Payout += b.payout
		return nil
	}
	for _, b := range singles {
		if err := pay(b); err != nil {
			return nil, err
		}
	}
	// Include only unsettled parents belonging to this account. Completed parents
	// can never be selected for a second payout, even in another division's run.
	rows, err = tx.QueryContext(ctx, `SELECT b.id,b.amount,b.potential_payout FROM bets b
 WHERE b.user_id=$1 AND b.division_participant_id IS NULL AND b.status='pending' AND b.settled_at IS NULL
 AND EXISTS (SELECT 1 FROM accumulator_bet_components c WHERE c.accumulator_bet_id=b.id)
 AND NOT EXISTS (SELECT 1 FROM accumulator_bet_components c JOIN bets leg ON leg.id=c.singular_bet_id
 WHERE c.accumulator_bet_id=b.id AND leg.status='pending') ORDER BY b.id`, userID)
	if err != nil {
		return nil, err
	}
	var parents []item
	for rows.Next() {
		var b item
		if err := rows.Scan(&b.id, &b.amount, &b.payout); err != nil {
			rows.Close()
			return nil, err
		}
		parents = append(parents, b)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	for _, b := range parents {
		legs, err := tx.QueryContext(ctx, `SELECT leg.status,leg.odds_at_time FROM accumulator_bet_components c
    JOIN bets leg ON leg.id=c.singular_bet_id WHERE c.accumulator_bet_id=$1 ORDER BY leg.id`, b.id)
		if err != nil {
			return nil, err
		}
		b.status = "won"
		allVoid, hasVoid := true, false
		var odds []float64
		for legs.Next() {
			var status string
			var price float64
			if err := legs.Scan(&status, &price); err != nil {
				legs.Close()
				return nil, err
			}
			if status == "lost" {
				b.status = "lost"
			}
			if status == "void" || status == "cancelled" {
				price = 1
				hasVoid = true
			} else {
				allVoid = false
			}
			odds = append(odds, price)
		}
		err = legs.Err()
		legs.Close()
		if err != nil {
			return nil, err
		}
		if allVoid {
			b.payout = b.amount
			b.status = "void"
		} else if hasVoid {
			b.payout = currency.MultiplyAndRound(b.amount, currency.MultiplyAndRound(odds...))
		}
		if _, err := tx.ExecContext(ctx, `UPDATE bets SET status=$2,settled_at=NOW(),potential_payout=$3 WHERE id=$1 AND settled_at IS NULL`, b.id, b.status, b.payout); err != nil {
			return nil, err
		}
		if err := pay(b); err != nil {
			return nil, err
		}
	}
	result.Payout = math.Round(result.Payout*100) / 100
	return result, nil
}

func validateOutcomesTx(ctx context.Context, tx *sql.Tx, division int64, outcomes []DivisionOutcomeParams) error {
	rows, err := tx.QueryContext(ctx, `SELECT id FROM division_participants WHERE division_id=$1`, division)
	if err != nil {
		return err
	}
	valid := map[string]bool{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		valid[id] = true
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(valid) == 0 || len(outcomes) != len(valid) {
		return ErrInvalidInput
	}
	positions := map[int8]bool{}
	winners := 0
	for _, o := range outcomes {
		if !valid[o.DivisionParticipantId] {
			return ErrInvalidInput
		}
		delete(valid, o.DivisionParticipantId)
		if o.Position != nil {
			if *o.Position <= 0 || positions[*o.Position] {
				return ErrInvalidInput
			}
			positions[*o.Position] = true
			if *o.Position == 1 {
				winners++
			}
		}
		if o.ResultStatus != nil && *o.ResultStatus != ResultStatusFinished && *o.ResultStatus != ResultStatusCancelled && *o.ResultStatus != ResultStatusDNF && *o.ResultStatus != ResultStatusNotScored {
			return ErrInvalidInput
		}
		if (o.ResultStatus == nil || *o.ResultStatus == ResultStatusFinished) && o.Position == nil {
			return ErrInvalidInput
		}
		if o.Score != nil && *o.Score < 0 {
			return ErrInvalidInput
		}
	}
	if winners != 1 {
		return ErrInvalidInput
	}
	return nil
}

func settleDivisionTx(ctx context.Context, tx *sql.Tx, settlement BetSettlement) error {
	rows, err := tx.QueryContext(ctx, `SELECT DISTINCT b.user_id::text FROM bets b JOIN users u ON u.id=b.user_id
 JOIN division_participants p ON p.id=b.division_participant_id WHERE p.division_id=$1 AND NOT u.is_demo ORDER BY b.user_id::text`, settlement.DivisionID)
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
	sort.Strings(ids)
	for _, id := range ids {
		if _, err := tx.ExecContext(ctx, `SELECT id FROM users WHERE id=$1 FOR UPDATE`, id); err != nil {
			return err
		}
	}
	var division int64
	if err := tx.QueryRowContext(ctx, `SELECT id FROM divisions WHERE id=$1 FOR UPDATE`, settlement.DivisionID).Scan(&division); err != nil {
		return err
	}
	if err := validateOutcomesTx(ctx, tx, division, settlement.Outcomes); err != nil {
		return err
	}
	var winners []string
	for _, o := range settlement.Outcomes {
		if o.Position != nil && *o.Position == 1 {
			winners = append(winners, o.DivisionParticipantId)
		}
	}
	for _, id := range ids {
		if _, err := settleUserTx(ctx, tx, id, []int64{division}, winners, false); err != nil {
			return err
		}
	}
	_, err = tx.ExecContext(ctx, `UPDATE divisions SET status='completed' WHERE id=$1`, division)
	return err
}

func (s *BetsStore) SettleDivisionBets(ctx context.Context, settlement BetSettlement) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(817204)`); err != nil {
			return err
		}
		return settleDivisionTx(ctx, tx, settlement)
	})
}

// Publishing the authoritative result and paying bets either both commit or both
// roll back. Replays with identical outcomes are safe; corrections are rejected.
func (s *BetsStore) PublishDivisionResult(ctx context.Context, params DivisionResultParams, userID uuid.UUID) (int64, error) {
	var id int64
	err := withTx(s.db, ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(817204)`); err != nil {
			return err
		}
		if err := validateOutcomesTx(ctx, tx, params.DivisionId, params.Results); err != nil {
			return err
		}
		err := tx.QueryRowContext(ctx, `SELECT id FROM division_results WHERE division_id=$1 ORDER BY id DESC LIMIT 1`, params.DivisionId).Scan(&id)
		if err == nil {
			rows, e := tx.QueryContext(ctx, `SELECT division_participant_id,position FROM division_result_outcomes WHERE division_result_id=$1`, id)
			if e != nil {
				return e
			}
			existing := map[string]int64{}
			for rows.Next() {
				var participant string
				var position sql.NullInt64
				if e := rows.Scan(&participant, &position); e != nil {
					rows.Close()
					return e
				}
				existing[participant] = position.Int64
			}
			e = rows.Err()
			rows.Close()
			if e != nil {
				return e
			}
			if len(existing) != len(params.Results) {
				return ErrConflict
			}
			for _, o := range params.Results {
				p := int64(0)
				if o.Position != nil {
					p = int64(*o.Position)
				}
				if old, ok := existing[o.DivisionParticipantId]; !ok || old != p {
					return ErrConflict
				}
			}
		} else if errors.Is(err, sql.ErrNoRows) {
			if err := tx.QueryRowContext(ctx, `INSERT INTO division_results (division_id,finalised_by,comments) VALUES ($1,$2,$3) RETURNING id`, params.DivisionId, userID, params.Comments).Scan(&id); err != nil {
				return err
			}
			for _, o := range params.Results {
				status := ResultStatusFinished
				if o.ResultStatus != nil {
					status = *o.ResultStatus
				}
				if _, err := tx.ExecContext(ctx, `INSERT INTO division_result_outcomes (division_result_id,division_participant_id,position,score,result_status,comments) VALUES ($1,$2,$3,$4,$5,$6)`, id, o.DivisionParticipantId, o.Position, o.Score, status, o.Comments); err != nil {
					return err
				}
			}
		} else {
			return err
		}
		return settleDivisionTx(ctx, tx, BetSettlement{DivisionID: params.DivisionId, DivisionResultID: id, Outcomes: params.Results})
	})
	return id, err
}
