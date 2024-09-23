package store

import (
	"context"
	"database/sql"
)

type User struct {
	id                    int64  `json:"id"`
	first_name            string `json:"first_name"`
	last_name             string `json:"last_name"`
	email                 string `json:"email"`
	email_verified        string `json:"email_verified"`
	password              string `json:"-"`
	image                 string `json:"image"`
	refresh_token_version int64  `json:"refresh_token_version"`
	created_at            string `json:"created_at"`
	updated_at            string `json:"updated_at"`
	// OAuth
	google_id string `json:"googleId"`
	x_id      string `json:"xId"` // twitter
	github_id string `json:"githubId"`
}

type UsersStore struct {
	db *sql.DB
}

func (s *UsersStore) Create(ctx context.Context, user *User) error {
	query := `
		INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) returning id, created_at
	`

	err := s.db.QueryRowContext(
		ctx,
		query,
		user.first_name,
		user.last_name,
		user.email,
		user.password,
	).Scan(
		&user.id,
		&user.created_at,
	)

	if err != nil {
		return err
	}

	return nil
}
