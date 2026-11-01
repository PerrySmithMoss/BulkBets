package store

import (
	"context"
	"database/sql"
	"errors"
)

// Only a digest is persisted. A new request invalidates the previous link.
func (s *UsersStore) SavePasswordReset(ctx context.Context, userID string, hash string) (bool, error) {
	result, err := s.db.ExecContext(ctx, `
		INSERT INTO password_resets (user_id, token_hash, expires_at)
		VALUES ($1, $2, NOW() + INTERVAL '30 minutes')
		ON CONFLICT (user_id) DO UPDATE SET token_hash = $2,
		created_at = NOW(), expires_at = NOW() + INTERVAL '30 minutes'
		WHERE password_resets.created_at < NOW() - INTERVAL '1 minute'`, userID, hash)
	if err != nil {
		return false, err
	}
	n, err := result.RowsAffected()
	return n > 0, err
}

func (s *UsersStore) ResetPassword(ctx context.Context, hash string, passwordHash string) error {
	return withTx(s.db, ctx, func(tx *sql.Tx) error {
		var userID string
		err := tx.QueryRowContext(ctx, `DELETE FROM password_resets
			WHERE token_hash = $1 AND expires_at > NOW() RETURNING user_id`, hash).Scan(&userID)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE users SET password_hash = $1,
			refresh_token_version = refresh_token_version + 1, updated_at = NOW()
			WHERE id = $2`, passwordHash, userID)
		return err
	})
}
