-- +goose Up
ALTER TABLE users ADD COLUMN date_of_birth DATE;
CREATE TABLE password_resets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- +goose Down
DROP TABLE password_resets;
ALTER TABLE users DROP COLUMN date_of_birth;
