package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound          = errors.New("resource not found")
	ErrConflict          = errors.New("resource already exists")
	QueryTimeoutDuration = time.Second * 5
)

type UserRepository interface {
	GetUserByID(ctx context.Context, userId string) (*User, error)
	Create(ctx context.Context, user *User) error
	Upsert(ctx context.Context, user *User) error
	SetRefreshTokenVersion(ctx context.Context, refreshTokenVersion int64, userId string) (int64, error)
	Builder() *UserBuilder
}

type ShowRepository interface {
	GetShowByID(ctx context.Context, showId int) (*ShowDetails, error)
}

type OddsRepository interface {
	FetchOdds(ctx context.Context, keys []OddsKey) (map[OddsKey]float64, error)
}

type Storage struct {
	UserRepository UserRepository
	ShowRepository ShowRepository
	OddsRepository OddsRepository
}

func NewStorage(db *sql.DB) Storage {
	return Storage{
		UserRepository: NewUsersStore(db),
		ShowRepository: NewShowsStore(db),
		OddsRepository: NewOddsStore(db),
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
