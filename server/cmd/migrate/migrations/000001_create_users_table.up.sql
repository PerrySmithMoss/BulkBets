CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id bigserial PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email citext UNIQUE NOT NULL,
    is_email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    password bytea NOT NULL,
    image VARCHAR(255),
    refresh_token_version BIGINT DEFAULT 1 NOT NULL,
    created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    google_id VARCHAR(255),
    x_id VARCHAR(255),
    github_id VARCHAR(255)
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();