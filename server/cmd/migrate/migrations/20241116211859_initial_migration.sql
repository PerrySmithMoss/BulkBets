-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');
CREATE TYPE show_status AS ENUM ('upcoming', 'ongoing', 'completed', 'canceled');
CREATE TYPE division_status AS ENUM ('scheduled', 'ongoing', 'completed', 'canceled');
CREATE TYPE division_participant_status AS ENUM ('registered', 'disqualified', 'active', 'pulled out', 'fulfilled');
CREATE TYPE bet_type AS ENUM ('win', 'place', 'show');
CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost', 'void', 'cancelled');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE currencies (
    code CHAR(3) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    exchange_rate DECIMAL(10,6) NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO currencies (code, name, symbol, is_active, exchange_rate, last_updated)
VALUES
    ('USD', 'United States Dollar', '$', FALSE, 1.000000, NOW()),
    ('EUR', 'Euro', '€', FALSE, 0.850000, NOW()),
    ('GBP', 'British Pound', '£', TRUE, 0.750000, NOW()),
    ('JPY', 'Japanese Yen', '¥', FALSE, 110.000000, NOW()),
    ('AUD', 'Australian Dollar', 'A$', FALSE, 1.300000, NOW()),
    ('CAD', 'Canadian Dollar', 'C$', FALSE, 1.250000, NOW()),
    ('CHF', 'Swiss Franc', 'CHF', FALSE, 0.920000, NOW()),
    ('CNY', 'Chinese Yuan', '¥', FALSE, 6.400000, NOW()),
    ('SEK', 'Swedish Krona', 'kr', FALSE, 8.600000, NOW()),
    ('NZD', 'New Zealand Dollar', 'NZ$', FALSE, 1.400000, NOW());

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    password_hash TEXT,
    profile_image VARCHAR(255),
    refresh_token_version BIGINT DEFAULT 1 NOT NULL,
    default_currency CHAR(3) REFERENCES currencies(code) DEFAULT 'GBP',
    last_login TIMESTAMPTZ,
    status user_status DEFAULT 'active',
    google_id VARCHAR(255),
    x_id VARCHAR(255),
    github_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    odds_format VARCHAR(10) DEFAULT 'decimal',
    timezone VARCHAR(50) DEFAULT 'UTC',
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0.00),
    -- for optimistic locking so we can combat race conditions 
    -- & detect conflicting modifications
    version INT NOT NULL DEFAULT 0
);

-- e.g., Arnold Classic, Mr. Olympia, Texas Pro 
CREATE TABLE shows (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(100),
    is_two_day_show BOOLEAN NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status show_status DEFAULT 'upcoming',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_show_dates CHECK (end_time > start_time)
);

-- Divisions within shows (e.g., woman's figure, men's open bodybuilding, men's 212 etc)
CREATE TABLE divisions (
    id BIGSERIAL PRIMARY KEY,
    show_id BIGINT REFERENCES shows(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    start_time TIMESTAMPTZ NOT NULL,
    status division_status DEFAULT 'scheduled',
    version INTEGER DEFAULT 1,
    schedule_changed_at TIMESTAMPTZ,
    schedule_changed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants/Athletes
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    residency VARCHAR(50),
    nationality VARCHAR(50),
    country_code CHAR(3),
    date_of_birth DATE CHECK (date_of_birth <= CURRENT_DATE),
    gender VARCHAR(10),
    meta_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE division_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id BIGSERIAL REFERENCES divisions(id) ON DELETE CASCADE,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
    pre_judge_score INTEGER,
    pre_judge_position INTEGER,
    final_score INTEGER,
    final_position INTEGER,
    status division_participant_status DEFAULT 'registered',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bet types (e.g., win, place)
CREATE TABLE bet_types (
    id BIGSERIAL PRIMARY KEY,
    name bet_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE betting_limits (
    id BIGSERIAL PRIMARY KEY,
    bet_type_id BIGINT REFERENCES bet_types(id),
    min_bet DECIMAL(10,2) NOT NULL,
    max_bet DECIMAL(10,2) NOT NULL,
    max_payout DECIMAL(10,2) NOT NULL,
    currency_code CHAR(3) REFERENCES currencies(code),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_betting_limits CHECK (min_bet > 0 AND max_bet > min_bet AND max_payout > max_bet)
);

CREATE TABLE odds (
    id BIGSERIAL PRIMARY KEY,
    division_participant_id UUID REFERENCES division_participants(id) ON DELETE CASCADE,
    bet_type_id BIGINT REFERENCES bet_types(id),
    odds_value DECIMAL(10,2) NOT NULL CHECK (odds_value > 0),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE odds_history (
    id BIGSERIAL PRIMARY KEY,
    odds_id BIGINT REFERENCES odds(id),
    previous_value DECIMAL(10,2) NOT NULL,
    new_value DECIMAL(10,2) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID REFERENCES users(id)
);

-- User bets
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    division_participant_id UUID REFERENCES division_participants(id) ON DELETE CASCADE,
    bet_type_id BIGSERIAL REFERENCES bet_types(id),
    -- The total amount (singular bets + accumulator bets) the user set's as stake
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency_code CHAR(3) REFERENCES currencies(code),
    odds_at_time DECIMAL(10,2) NOT NULL CHECK (odds_at_time > 0),
    -- Winnings = potential return - amount (stake) 
    potential_payout DECIMAL(10,2) NOT NULL CHECK (potential_payout >= 0),
    status bet_status DEFAULT 'pending',
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

-- Links accumulator bets to singular bets. 
CREATE TABLE accumulator_bet_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accumulator_bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    singular_bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (accumulator_bet_id, singular_bet_id)
);

-- Transactions table for user balance changes
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency_code CHAR(3) REFERENCES currencies(code),
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    reference_id UUID,
    status transaction_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_balance_change CHECK (balance_after - balance_before = amount)
);

-- Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_shows_updated_at
    BEFORE UPDATE ON shows
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_divisions_updated_at
    BEFORE UPDATE ON divisions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at
    BEFORE UPDATE ON athletes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_division_participants_updated_at
    BEFORE UPDATE ON division_participants
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_bet_types_updated_at
    BEFORE UPDATE ON bet_types
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_odds_updated_at
    BEFORE UPDATE ON odds
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Indexes
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_divisions_show_id ON divisions(show_id);
CREATE INDEX idx_division_participants_division_id ON division_participants(division_id);
CREATE INDEX idx_division_participants_scores ON division_participants(pre_judge_score, final_score);
CREATE INDEX idx_odds_division_participant_id ON odds(division_participant_id);
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_bets_status_created_at ON bets(status, created_at);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_shows_status_start_time ON shows(status, start_time);
CREATE INDEX idx_divisions_start_time ON divisions(start_time);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop triggers first
DROP TRIGGER IF EXISTS update_odds_updated_at ON odds;
DROP TRIGGER IF EXISTS update_bet_types_updated_at ON bet_types;
DROP TRIGGER IF EXISTS update_division_participants_updated_at ON division_participants;
DROP TRIGGER IF EXISTS update_athletes_updated_at ON athletes;
DROP TRIGGER IF EXISTS update_divisions_updated_at ON divisions;
DROP TRIGGER IF EXISTS update_shows_updated_at ON shows;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop indexes
DROP INDEX IF EXISTS idx_divisions_start_time;
DROP INDEX IF EXISTS idx_shows_status_start_time;
DROP INDEX IF EXISTS idx_transactions_created_at;
DROP INDEX IF EXISTS idx_bets_status_created_at;
DROP INDEX IF EXISTS idx_transactions_user_id;
DROP INDEX IF EXISTS idx_bets_user_id;
DROP INDEX IF EXISTS idx_odds_division_participant_id;
DROP INDEX IF EXISTS idx_division_participants_scores;
DROP INDEX IF EXISTS idx_division_participants_division_id;
DROP INDEX IF EXISTS idx_divisions_show_id;
DROP INDEX IF EXISTS idx_users_email;

-- Drop tables in correct order (dependent tables first)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS odds_history;
DROP TABLE IF EXISTS accumulator_bet_components;
DROP TABLE IF EXISTS bets;
DROP TABLE IF EXISTS odds;
DROP TABLE IF EXISTS betting_limits;
DROP TABLE IF EXISTS bet_types;
DROP TABLE IF EXISTS division_participants;
DROP TABLE IF EXISTS athletes;
DROP TABLE IF EXISTS divisions;
DROP TABLE IF EXISTS shows;
DROP TABLE IF EXISTS user_balances;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS currencies;

-- Drop update_updated_at_column function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop ENUM types
DROP TYPE IF EXISTS transaction_status;
DROP TYPE IF EXISTS bet_type;
DROP TYPE IF EXISTS bet_status;
DROP TYPE IF EXISTS division_participant_status;
DROP TYPE IF EXISTS division_status;
DROP TYPE IF EXISTS show_status;
DROP TYPE IF EXISTS user_status;

-- Drop extensions
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS citext;
-- +goose StatementEnd
