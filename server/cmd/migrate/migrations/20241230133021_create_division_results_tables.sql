-- +goose Up
-- +goose StatementBegin
-- Create ENUM for participant result status
CREATE TYPE participant_result_status AS ENUM ('finished', 'disqualified', 'DNF', 'not scored');

-- Table to store results for divisions
CREATE TABLE division_results (
    id BIGSERIAL PRIMARY KEY,
    division_id BIGSERIAL REFERENCES divisions(id) ON DELETE CASCADE,
    finalised_at TIMESTAMPTZ DEFAULT NOW(),
    finalised_by UUID REFERENCES users(id),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table to store outcomes for participants in a division
CREATE TABLE division_result_outcomes (
    id BIGSERIAL PRIMARY KEY,
    division_result_id BIGSERIAL REFERENCES division_results(id) ON DELETE CASCADE,
    division_participant_id UUID REFERENCES division_participants(id) ON DELETE CASCADE,
    position INTEGER CHECK (position > 0),
    score INTEGER CHECK (score >= 0), 
    result_status participant_result_status DEFAULT 'finished', 
    comments TEXT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_position_per_division_result UNIQUE (division_result_id, position),
    CHECK (result_status != 'finished' OR position IS NOT NULL)
);

-- Indexes for efficient queries
CREATE INDEX idx_division_results_division_id ON division_results(division_id);
CREATE INDEX idx_division_result_outcomes_result_id ON division_result_outcomes(division_result_id);

-- Triggers to auto-update timestamps
CREATE TRIGGER update_division_result_outcomes_updated_at
    BEFORE UPDATE ON division_result_outcomes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_division_results_updated_at
    BEFORE UPDATE ON division_results
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop triggers first
DROP TRIGGER IF EXISTS update_division_result_outcomes_updated_at ON division_result_outcomes;
DROP TRIGGER IF EXISTS update_division_results_updated_at ON division_results;

-- Drop indexes
DROP INDEX IF EXISTS idx_division_results_division_id;
DROP INDEX IF EXISTS idx_division_result_outcomes_result_id;

-- Drop tables in correct order (dependent tables first)
DROP TABLE IF EXISTS division_result_outcomes CASCADE;
DROP TABLE IF EXISTS division_results CASCADE;

-- Drop ENUM types
DROP TYPE IF EXISTS participant_result_status;
-- +goose StatementEnd
