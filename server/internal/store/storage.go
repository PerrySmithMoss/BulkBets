package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/PerrySmithMoss/BulkBets/server/internal/bets"
	"github.com/google/uuid"
)

var (
	ErrNotFound          = errors.New("resource not found")
	ErrConflict          = errors.New("resource already exists")
	QueryTimeoutDuration = time.Second * 5
)

type UserRepository interface {
	GetUserByID(ctx context.Context, userId string) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	Create(ctx context.Context, user *User) error
	SavePasswordReset(ctx context.Context, userID string, hash string) (bool, error)
	ResetPassword(ctx context.Context, hash string, passwordHash string) error
	Upsert(ctx context.Context, user *User) error
	SetRefreshTokenVersion(ctx context.Context, refreshTokenVersion int64, userId string) (int64, error)
	HasPermission(userID string, resource Resource, action Action) (bool, error)
	Builder() *UserBuilder
}

type ShowRepository interface {
	ListShows(ctx context.Context) ([]Show, error)
	GetShowByID(ctx context.Context, showId int) (*ShowDetails, error)
}

type DivisionRepository interface {
	GetDivisionByID(ctx context.Context, divisionId int, showId int) (*Division, error)
	CreateDivisionResult(ctx context.Context, params DivisionResultParams, userId uuid.UUID) (int64, error)
}

type OddsRepository interface {
	FetchOdds(ctx context.Context, keys []OddsKey) (map[OddsKey]float64, error)
}

type BetsRepository interface {
	CreateBet(ctx context.Context, betSlip *bets.BetSlip, user *User) error
	FetchUserBets(ctx context.Context, userId string, status []string, limit int, offset int) ([]BetResponse, error)
	SettleDivisionBets(ctx context.Context, settlement BetSettlement) error
}

type TransactionsRepository interface {
	CreateBetTransaction(ctx context.Context, params CreateBetTransactionParams) (*uuid.UUID, error)
}

type DemoRepository interface {
	Create(ctx context.Context) (*User, error)
	Reset(ctx context.Context, userID string) error
	Settle(ctx context.Context, userID string) (*DemoSettlement, error)
}

type Storage struct {
	DemoRepository         DemoRepository
	UserRepository         UserRepository
	ShowRepository         ShowRepository
	DivisionRepository     DivisionRepository
	OddsRepository         OddsRepository
	BetsRepository         BetsRepository
	TransactionsRepository TransactionsRepository
}

func NewStorage(db *sql.DB) Storage {
	return Storage{
		DemoRepository:         &DemoStore{db: db},
		UserRepository:         NewUsersStore(db),
		ShowRepository:         NewShowsStore(db),
		DivisionRepository:     NewDivisionsStore(db),
		OddsRepository:         NewOddsStore(db),
		BetsRepository:         NewBetsStore(db),
		TransactionsRepository: NewTransactionsStore(db),
	}
}

func withTx(db *sql.DB, ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}
