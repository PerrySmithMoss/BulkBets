package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/alexedwards/argon2id"
	"github.com/google/uuid"
)

var (
	ErrDuplicateEmail  = errors.New("a user with that email already exists")
	ErrNoPasswordSet   = errors.New("no password set for User")
	ErrInvalidPassword = errors.New("invalid password")
)

type User struct {
	Id                  uuid.UUID  `json:"id"`
	FirstName           string     `json:"first_name"`
	LastName            string     `json:"last_name"`
	Email               string     `json:"email"`
	IsEmailVerified     bool       `json:"is_email_verified"`
	EmailVerifiedAt     *time.Time `json:"email_verified_at"`
	Password            password   `json:"-"`
	ProfileImage        *string    `json:"profile_image"`
	RefreshTokenVersion int64      `json:"refresh_token_version"`
	CreatedAt           string     `json:"created_at"`
	UpdatedAt           string     `json:"updated_at"`
	// OAuth
	GoogleId *string `json:"google_id"`
	XId      *string `json:"x_id"` // twitter
	GithubId *string `json:"github_id"`
}

type password struct {
	text *string
	hash string
}

func (p *password) Set(text string) error {
	// Using default parameters: time=1, memory=64*1024 KiB, parallelism=4, salt length=16, key length=32
	hash, err := argon2id.CreateHash(text, argon2id.DefaultParams)
	if err != nil {
		return err
	}

	p.text = &text
	p.hash = hash

	return nil
}

func (p *password) IsSet() bool {
	return p.hash != ""
}

func (u *User) CheckPassword(password string) (bool, error) {
	if !strings.HasPrefix(u.Password.hash, "$argon2id$") {
		return false, ErrNoPasswordSet
	}

	match, err := argon2id.ComparePasswordAndHash(password, u.Password.hash)
	if err != nil {
		return false, fmt.Errorf("CheckPassword: %w", err)
	}
	if !match {
		return false, ErrInvalidPassword
	}
	return true, nil
}

// UserBuilder helps in constructing User instances
type UserBuilder struct {
	user *User
}

func (s *UsersStore) Builder() *UserBuilder {
	return &UserBuilder{user: &User{}}
}

func (b *UserBuilder) SetFirstName(firstName string) *UserBuilder {
	b.user.FirstName = firstName
	return b
}

func (b *UserBuilder) SetLastName(lastName string) *UserBuilder {
	b.user.LastName = lastName
	return b
}

func (b *UserBuilder) SetEmail(email string) *UserBuilder {
	b.user.Email = email
	return b
}

func (b *UserBuilder) SetIsEmailVerified(isVerified bool) *UserBuilder {
	b.user.IsEmailVerified = isVerified
	return b
}

func (b *UserBuilder) SetEmailVerifiedAt(t time.Time) *UserBuilder {
	b.user.EmailVerifiedAt = &t
	return b
}

func (b *UserBuilder) SetProfileImage(image string) *UserBuilder {
	b.user.ProfileImage = &image
	return b
}

func (b *UserBuilder) SetGoogleId(id string) *UserBuilder {
	b.user.GoogleId = &id
	return b
}

func (b *UserBuilder) Build() *User {
	return b.user
}

type UsersStore struct {
	db *sql.DB
}

func NewUsersStore(db *sql.DB) *UsersStore {
	return &UsersStore{db: db}
}

// TODO: refactor
func (s *UsersStore) Create(ctx context.Context, user *User) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		query := `
		INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) returning id, created_at
	`

		ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
		defer cancel()

		err := tx.QueryRowContext(
			ctx,
			query,
			user.FirstName,
			user.LastName,
			user.Email,
			user.Password,
		).Scan(
			&user.Id,
			&user.CreatedAt,
		)
		if err != nil {
			switch {
			case err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"`:
				return ErrDuplicateEmail
			default:
				return err
			}
		}

		return nil
	})
}

func (s *UsersStore) Upsert(ctx context.Context, user *User) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		query := `
		INSERT INTO users (first_name, last_name, email, password_hash, google_id, github_id, x_id, is_email_verified, email_verified_at, profile_image)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (email) DO UPDATE 
		SET first_name = EXCLUDED.first_name,
			last_name = EXCLUDED.last_name,
			password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
			google_id = COALESCE(EXCLUDED.google_id, users.google_id),
			github_id = COALESCE(EXCLUDED.github_id, users.github_id),
			x_id = COALESCE(EXCLUDED.x_id, users.x_id),
			is_email_verified = EXCLUDED.is_email_verified,
			email_verified_at = COALESCE(EXCLUDED.email_verified_at, users.email_verified_at),
			profile_image = COALESCE(EXCLUDED.profile_image, users.profile_image),
			refresh_token_version = users.refresh_token_version + 1 -- Increment version on update
		RETURNING id, created_at, updated_at, refresh_token_version
		`

		ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
		defer cancel()

		var passwordHash *string
		if user.Password.IsSet() {
			passwordHash = &user.Password.hash
		}

		var profileImage *string
		var emailVerifiedAt *time.Time
		var googleId, githubId, xId *string

		// Convert string fields to pointers
		if user.ProfileImage != nil {
			profileImage = user.ProfileImage
		}
		if !user.EmailVerifiedAt.IsZero() {
			emailVerifiedAt = user.EmailVerifiedAt
		}
		if user.GoogleId != nil {
			googleId = user.GoogleId
		}
		if user.GithubId != nil {
			githubId = user.GithubId
		}
		if user.XId != nil {
			xId = user.XId
		}

		err := tx.QueryRowContext(
			ctx,
			query,
			user.FirstName,
			user.LastName,
			user.Email,
			passwordHash,
			googleId,
			githubId,
			xId,
			user.IsEmailVerified,
			emailVerifiedAt,
			profileImage,
		).Scan(
			&user.Id,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.RefreshTokenVersion,
		)
		if err != nil {
			switch {
			case err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"`:
				return ErrDuplicateEmail
			default:
				return err
			}
		}

		return nil
	})
}

func (s *UsersStore) GetByID(ctx context.Context, userId string) (*User, error) {
	query := `
			SELECT id, first_name, last_name, email, is_email_verified, email_verified_at, profile_image, google_id, x_id, github_id, refresh_token_version, created_at, updated_at
			FROM users
			WHERE id = $1
		`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	user := &User{}

	var emailVerifiedAt *time.Time
	var profileImage *string
	var googleId, githubId, xId *string

	err := s.db.QueryRowContext(
		ctx,
		query,
		userId,
	).Scan(
		&user.Id,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.IsEmailVerified,
		&emailVerifiedAt,
		&profileImage,
		&googleId,
		&xId,
		&githubId,
		&user.RefreshTokenVersion,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrNotFound
		default:
			return nil, err
		}
	}

	// Set the pointer fields in the User struct
	user.EmailVerifiedAt = emailVerifiedAt
	user.ProfileImage = profileImage
	user.GoogleId = googleId
	user.GithubId = githubId
	user.XId = xId

	// log.Printf("User fetched: %+v", user)

	return user, nil
}

func (s *UsersStore) SetRefreshTokenVersion(ctx context.Context, refreshTokenVersion int64, userId string) (int64, error) {
	query := `
        UPDATE users
        SET refresh_token_version = $1
        WHERE id = $2
        RETURNING refresh_token_version;
    `

	var updatedVersion int64
	err := s.db.QueryRowContext(ctx, query, refreshTokenVersion, userId).Scan(&updatedVersion)
	if err != nil {
		return 0, fmt.Errorf("failed to set new refresh_token_version: %w", err)
	}

	return updatedVersion, nil
}
