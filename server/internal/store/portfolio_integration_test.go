package store

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"sync"
	"testing"

	"github.com/PerrySmithMoss/BulkBets/server/internal/bets"
	"github.com/google/uuid"
)

type fixture struct {
	db           *sql.DB
	user         *User
	show         int64
	divisions    []int64
	participants [][]string
	winType      int64
}

func integrationFixture(t *testing.T, demo bool) *fixture {
	t.Helper()
	dsn := os.Getenv("BULKBETS_TEST_DSN")
	if dsn == "" {
		t.Skip("set BULKBETS_TEST_DSN to an isolated migrated database")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	f := &fixture{db: db, user: &User{Id: uuid.New(), DefaultCurrency: "GBP", IsDemo: demo}}
	f.exec(t, `INSERT INTO users (id,first_name,last_name,email,is_demo) VALUES ($1,'Test','Visitor',$2,$3)`, f.user.Id, f.user.Id.String()+"@integration.invalid", demo)
	f.exec(t, `INSERT INTO user_balances (user_id,balance) VALUES ($1,1000)`, f.user.Id)
	if err := db.QueryRow(`INSERT INTO shows (name,is_two_day_show,start_time,end_time) VALUES ('Integration fixture',false,NOW()+INTERVAL '2 days',NOW()+INTERVAL '4 days') RETURNING id`).Scan(&f.show); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT id FROM bet_types WHERE name='win'`).Scan(&f.winType); err != nil {
		t.Fatal(err)
	}
	var athletes []string
	for range 2 {
		var division int64
		if err := db.QueryRow(`INSERT INTO divisions (show_id,name,start_time) VALUES ($1,'Integration',NOW()+INTERVAL '3 days') RETURNING id`, f.show).Scan(&division); err != nil {
			t.Fatal(err)
		}
		f.divisions = append(f.divisions, division)
		var participants []string
		for i := range 2 {
			var athlete, participant string
			if err := db.QueryRow(`INSERT INTO athletes (first_name,last_name) VALUES ('Integration','Athlete') RETURNING id`).Scan(&athlete); err != nil {
				t.Fatal(err)
			}
			athletes = append(athletes, athlete)
			if err := db.QueryRow(`INSERT INTO division_participants (division_id,athlete_id) VALUES ($1,$2) RETURNING id`, division, athlete).Scan(&participant); err != nil {
				t.Fatal(err)
			}
			f.exec(t, `INSERT INTO odds (division_participant_id,bet_type_id,odds_value) VALUES ($1,$2,$3)`, participant, f.winType, 2+i*2)
			participants = append(participants, participant)
		}
		f.participants = append(f.participants, participants)
	}
	t.Cleanup(func() {
		for _, q := range []string{`DELETE FROM wallet_requests WHERE user_id=$1`, `DELETE FROM transactions WHERE user_id=$1`, `DELETE FROM shows WHERE owner_id=$1`} {
			if _, err := db.Exec(q, f.user.Id); err != nil {
				t.Error(err)
			}
		}
		if _, err := db.Exec(`DELETE FROM shows WHERE id=$1`, f.show); err != nil {
			t.Error(err)
		}
		if _, err := db.Exec(`DELETE FROM users WHERE id=$1`, f.user.Id); err != nil {
			t.Error(err)
		}
		for _, athlete := range athletes {
			db.Exec(`DELETE FROM athletes WHERE id=$1`, athlete)
		}
		db.Exec(`DELETE FROM athletes WHERE meta_data->>'sandbox_owner'=$1`, f.user.Id.String())
		db.Close()
	})
	return f
}
func (f *fixture) exec(t *testing.T, q string, args ...any) {
	t.Helper()
	if _, err := f.db.Exec(q, args...); err != nil {
		t.Fatal(err)
	}
}
func (f *fixture) balance(t *testing.T) float64 {
	t.Helper()
	var n float64
	if err := f.db.QueryRow(`SELECT balance FROM user_balances WHERE user_id=$1`, f.user.Id).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}
func (f *fixture) outcomes(index int) []DivisionOutcomeParams {
	first, second := int8(1), int8(2)
	return []DivisionOutcomeParams{{DivisionParticipantId: f.participants[index][0], Position: &first}, {DivisionParticipantId: f.participants[index][1], Position: &second}}
}
func (f *fixture) single(t *testing.T, index int) {
	t.Helper()
	amount, payout := 10.0, 20.0
	slip := &bets.BetSlip{ActiveBets: []bets.ActiveBet{{ShowId: f.show, DivisionId: f.divisions[index], CompetitorId: f.participants[index][0], BetTypeId: f.winType, BetType: bets.Win, Amount: &amount, Odds: 2, PotentialPayout: &payout}}}
	if err := NewBetsStore(f.db).CreateBet(context.Background(), slip, f.user); err != nil {
		t.Fatal(err)
	}
}

func TestIntegrationOfficialSettlementIsAtomicAndIdempotent(t *testing.T) {
	f := integrationFixture(t, false)
	ctx := context.Background()
	s := NewBetsStore(f.db)
	f.single(t, 0)
	stake, payout := 10.0, 40.0
	slip := &bets.BetSlip{StakeMultiplier: &stake, OddsAtTime: 4, PotentialPayout: &payout}
	for i := range 2 {
		slip.ActiveBets = append(slip.ActiveBets, bets.ActiveBet{ShowId: f.show, DivisionId: f.divisions[i], CompetitorId: f.participants[i][0], BetTypeId: f.winType, BetType: bets.Win, Odds: 2})
	}
	if err := s.CreateBet(ctx, slip, f.user); err != nil {
		t.Fatal(err)
	}
	if f.balance(t) != 980 {
		t.Fatal("incorrect placement debit")
	}
	if _, err := s.PublishDivisionResult(ctx, DivisionResultParams{DivisionId: f.divisions[0], Results: f.outcomes(1)}, f.user.Id); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("foreign outcomes accepted: %v", err)
	}
	var count int
	f.db.QueryRow(`SELECT COUNT(*) FROM division_results WHERE division_id=$1`, f.divisions[0]).Scan(&count)
	if count != 0 {
		t.Fatal("invalid publication committed")
	}
	first, err := s.PublishDivisionResult(ctx, DivisionResultParams{DivisionId: f.divisions[0], Results: f.outcomes(0)}, f.user.Id)
	if err != nil {
		t.Fatal(err)
	}
	if f.balance(t) != 1000 {
		t.Fatal("winning single was not paid")
	}
	var wg sync.WaitGroup
	errs := make(chan error, 8)
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := s.PublishDivisionResult(ctx, DivisionResultParams{DivisionId: f.divisions[1], Results: f.outcomes(1)}, f.user.Id)
			errs <- err
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	again, err := s.PublishDivisionResult(ctx, DivisionResultParams{DivisionId: f.divisions[0], Results: f.outcomes(0)}, f.user.Id)
	if err != nil || again != first {
		t.Fatalf("publication replay failed: %v", err)
	}
	if got := f.balance(t); got != 1040 {
		t.Fatalf("expected exactly one single and accumulator payout, got balance %v", got)
	}
	f.db.QueryRow(`SELECT COUNT(*) FROM transactions WHERE user_id=$1 AND transaction_type='BET_PAYOUT'`, f.user.Id).Scan(&count)
	if count != 2 {
		t.Fatalf("expected two payout receipts, got %d", count)
	}
	if _, err := NewTransactionsStore(f.db).CreateBetTransaction(ctx, CreateBetTransactionParams{UserID: uuid.New(), CurrencyCode: "GBP"}); err == nil {
		t.Fatal("transaction insert error was swallowed")
	}
}

func TestIntegrationWalletRetriesAndConcurrentOverspend(t *testing.T) {
	f := integrationFixture(t, true)
	ctx := context.Background()
	s := &DemoStore{db: f.db}
	key := uuid.NewString()
	var wg sync.WaitGroup
	errs := make(chan error, 8)
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := s.Transfer(ctx, f.user.Id.String(), key, "DEMO_DEPOSIT", 100.25)
			errs <- err
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	if f.balance(t) != 1100.25 {
		t.Fatal("deposit was duplicated")
	}
	if _, err := s.Transfer(ctx, f.user.Id.String(), key, "DEMO_WITHDRAWAL", 100.25); !errors.Is(err, ErrConflict) {
		t.Fatal("key reused for a different payload")
	}
	if _, err := s.Transfer(ctx, f.user.Id.String(), uuid.NewString(), "DEMO_DEPOSIT", 0.001); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("fractional penny accepted")
	}
	successes := make(chan bool, 2)
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := s.Transfer(ctx, f.user.Id.String(), uuid.NewString(), "DEMO_WITHDRAWAL", 1000)
			if err != nil && !errors.Is(err, ErrInsufficientFunds) {
				t.Error(err)
			}
			successes <- err == nil
		}()
	}
	wg.Wait()
	close(successes)
	count := 0
	for ok := range successes {
		if ok {
			count++
		}
	}
	if count != 1 || f.balance(t) != 100.25 {
		t.Fatal("concurrent withdrawal overspent wallet")
	}
	history, err := s.Wallet(ctx, f.user.Id.String())
	if err != nil || len(history) != 2 {
		t.Fatalf("wallet receipts missing: %v", err)
	}
}

func TestIntegrationPrivateEventIsolationPreviewAndAutomaticPayout(t *testing.T) {
	f := integrationFixture(t, true)
	ctx := context.Background()
	s := &DemoStore{db: f.db}
	userID := f.user.Id.String()
	showID, err := s.CreateSandboxShow(ctx, userID, SandboxShowInput{Name: "Private integration", Division: "Open", Competitors: []SandboxCompetitor{{FirstName: "Alex", LastName: "Stone", Odds: 2}, {FirstName: "Sam", LastName: "Reed", Odds: 4}}})
	if err != nil {
		t.Fatal(err)
	}
	showStore := NewShowsStore(f.db)
	details, err := showStore.GetShowByID(WithViewer(ctx, userID), int(showID))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := showStore.GetShowByID(WithViewer(ctx, uuid.NewString()), int(showID)); !errors.Is(err, ErrNotFound) {
		t.Fatal("another visitor can read private show")
	}
	division := details.Divisions[0]
	athlete := details.Competitors[division.ID][0]
	price := athlete.Odds[0].OddsValue
	amount := 10.0
	payout := amount * price
	slip := &bets.BetSlip{ActiveBets: []bets.ActiveBet{{ShowId: showID, DivisionId: division.ID, CompetitorId: athlete.ID, BetTypeId: f.winType, BetType: bets.Win, Odds: price, Amount: &amount, PotentialPayout: &payout}}}
	if err := NewBetsStore(f.db).CreateBet(ctx, slip, f.user); err != nil {
		t.Fatal(err)
	}
	if err := s.EditSandbox(ctx, userID, showID, SandboxEdit{Operation: "set_winner", DivisionID: division.ID, ParticipantID: athlete.ID}); err != nil {
		t.Fatal(err)
	}
	preview, err := s.PreviewSandbox(ctx, userID, showID, "favourite")
	if err != nil || preview.Payout != payout {
		t.Fatalf("invalid preview: %+v %v", preview, err)
	}
	if f.balance(t) != 990 {
		t.Fatal("preview changed the balance")
	}
	if err := s.RunSandbox(ctx, userID, showID, "favourite"); err != nil {
		t.Fatal(err)
	}
	if err := NewBetsStore(f.db).CreateBet(ctx, slip, f.user); !errors.Is(err, ErrMarketClosed) {
		t.Fatalf("closed private market accepted a bet: %v", err)
	}
	if _, err := s.Settle(ctx, userID); err != nil {
		t.Fatal(err)
	}
	if f.balance(t) != 990 {
		t.Fatal("global replay settled private event early")
	}
	f.exec(t, `UPDATE shows SET settle_at=NOW()-INTERVAL '1 second' WHERE id=$1`, showID)
	if err := s.Maintain(ctx); err != nil {
		t.Fatal(err)
	}
	if err := s.Maintain(ctx); err != nil {
		t.Fatal(err)
	}
	if f.balance(t) != 990+payout {
		t.Fatal("automatic settlement missing or duplicated")
	}
	details, err = showStore.GetShowByID(WithViewer(ctx, userID), int(showID))
	if err != nil || details.Show.Status != "completed" {
		t.Fatal("event did not finish")
	}
	if err := s.RunSandbox(ctx, userID, showID, "void"); !errors.Is(err, ErrConflict) {
		t.Fatal("completed event restarted")
	}
}

func TestIntegrationVoidedLegReducesAccumulatorAndResetIsIsolated(t *testing.T) {
	f := integrationFixture(t, true)
	ctx := context.Background()
	s := &DemoStore{db: f.db}
	f.single(t, 0)
	stake, payout := 10.0, 40.0
	slip := &bets.BetSlip{StakeMultiplier: &stake, OddsAtTime: 4, PotentialPayout: &payout}
	for i := range 2 {
		slip.ActiveBets = append(slip.ActiveBets, bets.ActiveBet{ShowId: f.show, DivisionId: f.divisions[i], CompetitorId: f.participants[i][0], BetTypeId: f.winType, BetType: bets.Win, Odds: 2})
	}
	if err := NewBetsStore(f.db).CreateBet(ctx, slip, f.user); err != nil {
		t.Fatal(err)
	}
	if err := withTx(f.db, ctx, func(tx *sql.Tx) error {
		if err := lockDemo(ctx, tx, f.user.Id.String()); err != nil {
			return err
		}
		_, err := settleUserTx(ctx, tx, f.user.Id.String(), f.divisions[:1], nil, true)
		return err
	}); err != nil {
		t.Fatal(err)
	}
	if f.balance(t) != 990 {
		t.Fatal("voided single stake not returned")
	}
	if err := withTx(f.db, ctx, func(tx *sql.Tx) error {
		if err := lockDemo(ctx, tx, f.user.Id.String()); err != nil {
			return err
		}
		_, err := settleUserTx(ctx, tx, f.user.Id.String(), f.divisions[1:], []string{f.participants[1][0]}, false)
		return err
	}); err != nil {
		t.Fatal(err)
	}
	if f.balance(t) != 1010 {
		t.Fatal("voided accumulator leg did not reduce to odds 1")
	}
	if _, err := s.Transfer(ctx, f.user.Id.String(), uuid.NewString(), "DEMO_DEPOSIT", 100); err != nil {
		t.Fatal(err)
	}
	if err := s.Reset(ctx, f.user.Id.String()); err != nil {
		t.Fatal(err)
	}
	if f.balance(t) != 1000 {
		t.Fatal("reset did not restore wallet")
	}
	receipts, err := s.Wallet(ctx, f.user.Id.String())
	if err != nil || len(receipts) != 0 {
		t.Fatal("reset left receipts behind")
	}
}

func TestIntegrationGuestRetentionPreservesRegisteredAccounts(t *testing.T) {
	guest := integrationFixture(t, true)
	registered := integrationFixture(t, true)
	guest.exec(t, `UPDATE users SET email=$2,last_seen_at=NOW()-INTERVAL '31 days' WHERE id=$1`, guest.user.Id, guest.user.Id.String()+"@demo.bulkbets.invalid")
	registered.exec(t, `UPDATE users SET password_hash='retained-test-account',last_seen_at=NOW()-INTERVAL '31 days' WHERE id=$1`, registered.user.Id)
	s := &DemoStore{db: guest.db}
	if _, err := s.Transfer(context.Background(), guest.user.Id.String(), uuid.NewString(), "DEMO_DEPOSIT", 10); err != nil {
		t.Fatal(err)
	}
	if err := s.cleanupGuests(context.Background()); err != nil {
		t.Fatal(err)
	}
	var guests, accounts int
	guest.db.QueryRow(`SELECT COUNT(*) FROM users WHERE id=$1`, guest.user.Id).Scan(&guests)
	guest.db.QueryRow(`SELECT COUNT(*) FROM users WHERE id=$1`, registered.user.Id).Scan(&accounts)
	if guests != 0 || accounts != 1 {
		t.Fatalf("retention deleted wrong accounts: guest=%d registered=%d", guests, accounts)
	}
}
