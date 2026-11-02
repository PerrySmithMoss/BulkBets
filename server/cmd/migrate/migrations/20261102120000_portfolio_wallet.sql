-- +goose Up
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE shows ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE shows ADD COLUMN settle_at TIMESTAMPTZ;
ALTER TABLE shows ADD COLUMN simulation_mode TEXT NOT NULL DEFAULT 'favourite'
    CHECK (simulation_mode IN ('favourite', 'upset', 'void'));
ALTER TABLE odds_history DROP CONSTRAINT odds_history_odds_id_fkey;
ALTER TABLE odds_history ADD CONSTRAINT odds_history_odds_id_fkey FOREIGN KEY (odds_id) REFERENCES odds(id) ON DELETE CASCADE;
CREATE INDEX idx_shows_owner ON shows(owner_id);
CREATE INDEX idx_demo_cleanup ON users(last_seen_at) WHERE is_demo;

CREATE TABLE wallet_requests (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_key UUID NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('DEMO_DEPOSIT', 'DEMO_WITHDRAWAL')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0 AND amount <= 10000),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    PRIMARY KEY (user_id, request_key)
);
CREATE UNIQUE INDEX idx_unique_settlement_credit ON transactions(user_id, reference_id, transaction_type)
    WHERE transaction_type IN ('BET_PAYOUT', 'BET_REFUND', 'DEMO_PAYOUT', 'DEMO_REFUND');

-- Registered customers use the same virtual-money experience as guest visitors.
-- Preserve the bootstrap admin's ordinary-account checks and permissions.
UPDATE users SET is_demo = TRUE WHERE email <> 'admin@bulkbets.com';

-- +goose Down
ALTER TABLE odds_history DROP CONSTRAINT odds_history_odds_id_fkey;
ALTER TABLE odds_history ADD CONSTRAINT odds_history_odds_id_fkey FOREIGN KEY (odds_id) REFERENCES odds(id);
DROP INDEX idx_unique_settlement_credit;
DROP TABLE wallet_requests;
DROP INDEX idx_demo_cleanup;
DROP INDEX idx_shows_owner;
ALTER TABLE shows DROP COLUMN simulation_mode, DROP COLUMN settle_at, DROP COLUMN owner_id;
ALTER TABLE users DROP COLUMN last_seen_at;
