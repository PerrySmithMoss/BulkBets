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
	"github.com/lib/pq"
)

// Resource represents different resources in the system
type Resource string

const (
	ResourceBettingResults Resource = "betting_results"
	ResourceUsers          Resource = "users"
	ResourcePayments       Resource = "payments"
	ResourceReports        Resource = "reports"
)

// Action represents different actions that can be performed on resources
type Action string

const (
	ActionRead   Action = "read"
	ActionWrite  Action = "write"
	ActionDelete Action = "delete"
	ActionAdmin  Action = "admin"
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
	Password            Password   `json:"-"`
	ProfileImage        *string    `json:"profile_image"`
	RefreshTokenVersion int64      `json:"-"`
	DefaultCurrency     string     `json:"default_currency"`
	Balance             float64    `json:"balance"`
	DateOfBirth         *time.Time `json:"-"`
	CreatedAt           string     `json:"created_at"`
	UpdatedAt           string     `json:"updated_at"`
	// OAuth
	GoogleId *string `json:"-"`
	XId      *string `json:"-"` // twitter
	GithubId *string `json:"-"`
}

type Password struct {
	text *string
	hash string
}

func (p *Password) Set(text string) error {
	// Using default parameters: time=1, memory=64*1024 KiB, parallelism=4, salt length=16, key length=32
	hash, err := argon2id.CreateHash(text, argon2id.DefaultParams)
	if err != nil {
		return err
	}

	p.text = &text
	p.hash = hash

	return nil
}

func (p *Password) GetPasswordHash() string {
	return p.hash
}

func (p *Password) IsSet() bool {
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

type UserBuilder struct {
	user *User
}

func NewUserBuilder() *UserBuilder {
	return &UserBuilder{user: &User{}}
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

func (b *UserBuilder) SetPassword(password string) *UserBuilder {
	// Set the password hash using the password struct's Set method
	var pass Password
	err := pass.Set(password) // This will hash the password
	if err != nil {
		// Handle error if password setting fails (optional: return an error)
		// For now, we will panic, but in production, you might want to return an error
		panic("Failed to set password: " + err.Error())
	}
	b.user.Password = pass
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
	if b.user == nil {
		panic("UserBuilder is not properly initialised")
	}
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
			INSERT INTO users (first_name, last_name, email, password_hash, date_of_birth)
			    VALUES ($1, $2, $3, $4, $5)
			RETURNING
			    id, created_at`

		ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
		defer cancel()

		err := tx.QueryRowContext(
			ctx,
			query,
			user.FirstName,
			user.LastName,
			user.Email,
			user.Password.GetPasswordHash(),
			user.DateOfBirth,
		).Scan(
			&user.Id,
			&user.CreatedAt,
		)
		if err != nil {
			var pgErr *pq.Error
			switch {
			case errors.As(err, &pgErr) && pgErr.Code == "23505":
				return ErrDuplicateEmail
			default:
				return err
			}
		}

		_, err = tx.ExecContext(ctx, `INSERT INTO user_balances (user_id, balance) VALUES ($1, 0)`, user.Id)
		return err
	})
}

func (s *UsersStore) Upsert(ctx context.Context, user *User) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		query := `
			INSERT INTO users (first_name, last_name, email, password_hash, google_id, github_id, x_id, is_email_verified, email_verified_at, profile_image)
			    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (email)
			    DO UPDATE SET
			        first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash), google_id = COALESCE(EXCLUDED.google_id, users.google_id), github_id = COALESCE(EXCLUDED.github_id, users.github_id), x_id = COALESCE(EXCLUDED.x_id, users.x_id), is_email_verified = EXCLUDED.is_email_verified, email_verified_at = COALESCE(EXCLUDED.email_verified_at, users.email_verified_at), profile_image = COALESCE(EXCLUDED.profile_image, users.profile_image), refresh_token_version = users.refresh_token_version + 1 -- Increment version on update
			    RETURNING
			        id, created_at, updated_at, refresh_token_version`

		// 1. Create user
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
		if user.EmailVerifiedAt != nil && !user.EmailVerifiedAt.IsZero() {
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

		// 2. Create corresponding balance entry
		//   TODO: extract into user_balances store
		_, err = tx.Exec(`
			INSERT INTO user_balances (user_id, balance, version)
			    VALUES ($1, 0.00, 0)
			ON CONFLICT (user_id)
			    DO NOTHING`, user.Id)
		if err != nil {
			return err
		}

		return nil
	})
}

func (s *UsersStore) GetUserByID(ctx context.Context, userId string) (*User, error) {
	query := `
		SELECT
		    u.id,
		    u.first_name,
		    u.last_name,
		    u.email,
		    u.is_email_verified,
		    u.email_verified_at,
		    u.profile_image,
		    u.google_id,
		    u.x_id,
		    u.github_id,
		    u.refresh_token_version,
		    u.default_currency,
		    COALESCE(ub.balance, 0.00) AS balance,
		    u.created_at,
		    u.updated_at
		FROM
		    users u
		    LEFT JOIN user_balances ub ON u.id = ub.user_id
		WHERE
		    u.id = $1`

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
		&user.DefaultCurrency,
		&user.Balance,
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

	return user, nil
}

func (s *UsersStore) SetRefreshTokenVersion(ctx context.Context, refreshTokenVersion int64, userId string) (int64, error) {
	query := `
		UPDATE
		    users
		SET
		    refresh_token_version = $1
		WHERE
		    id = $2
		RETURNING
		    refresh_token_version;
		
		`

	var updatedVersion int64
	err := s.db.QueryRowContext(ctx, query, refreshTokenVersion, userId).Scan(&updatedVersion)
	if err != nil {
		return 0, fmt.Errorf("failed to set new refresh_token_version: %w", err)
	}

	return updatedVersion, nil
}

func (s *UsersStore) HasPermission(userID string, resource Resource, action Action) (bool, error) {
	query := `
		SELECT
		    EXISTS (
		        SELECT
		            1
		        FROM
		            user_roles ur
		            JOIN role_permissions rp ON ur.role_id = rp.role_id
		            JOIN permissions p ON rp.permission_id = p.id
		        WHERE
		            ur.user_id = $1
		            AND p.resource = $2
		            AND p.action::TEXT = $3)`

	var hasPermission bool
	err := s.db.QueryRow(query, userID, resource, action).Scan(&hasPermission)
	if err != nil {
		return false, err
	}
	return hasPermission, nil
}

func (s *UsersStore) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT
		    id,
		    first_name,
		    last_name,
		    email,
		    is_email_verified,
		    email_verified_at,
		    profile_image,
		    COALESCE(password_hash, ''),
		    refresh_token_version,
		    created_at,
		    updated_at
		FROM
		    users
		WHERE
		    email = $1`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeoutDuration)
	defer cancel()

	user := &User{}

	var emailVerifiedAt *time.Time
	var profileImage *string

	err := s.db.QueryRowContext(
		ctx,
		query,
		email,
	).Scan(
		&user.Id,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.IsEmailVerified,
		&emailVerifiedAt,
		&profileImage,
		&user.Password.hash,
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

	return user, nil
}
