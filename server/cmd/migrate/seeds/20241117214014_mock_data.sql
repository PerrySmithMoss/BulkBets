-- +goose Up
-- +goose StatementBegin
-- Seed Shows
WITH inserted_shows AS (
  INSERT INTO shows (name, description, location, is_two_day_show, start_time, end_time, status) VALUES
    ('2024 Mr. Olympia', 'The most prestigious professional bodybuilding competition', 'Las Vegas, Nevada', true, '2024-09-26 10:00:00-07:00'::TIMESTAMPTZ, '2024-09-28 22:00:00-07:00'::TIMESTAMPTZ, 'upcoming'),
    ('2024 Arnold Classic', 'Second most prestigious bodybuilding show', 'Columbus, Ohio', true, '2024-03-01 09:00:00-05:00'::TIMESTAMPTZ, '2024-03-02 22:00:00-05:00'::TIMESTAMPTZ, 'completed'),
    ('2024 Texas Pro', 'IFBB Professional League Qualifier', 'Houston, Texas', false, '2024-08-15 10:00:00-05:00'::TIMESTAMPTZ, '2024-08-15 22:00:00-05:00'::TIMESTAMPTZ, 'upcoming')
  RETURNING id, name
)
-- Seed Divisions using the returned show IDs
INSERT INTO divisions (show_id, name, category, start_time, status)
SELECT 
    s.id,
    d.name,
    d.category,
    d.start_time,
    d.status::division_status
FROM inserted_shows s
CROSS JOIN LATERAL (
    VALUES 
      ('2024 Mr. Olympia', 'Men''s Open Bodybuilding', 'Bodybuilding', '2024-09-27 19:00:00-07:00'::TIMESTAMPTZ, 'scheduled'),
      ('2024 Mr. Olympia', 'Classic Physique', 'Classic', '2024-09-27 17:00:00-07:00'::TIMESTAMPTZ, 'scheduled'),
      ('2024 Mr. Olympia', 'Women''s Figure', 'Figure', '2024-09-26 15:00:00-07:00'::TIMESTAMPTZ, 'scheduled'),
      ('2024 Arnold Classic', 'Men''s Open Bodybuilding', 'Bodybuilding', '2024-03-02 19:00:00-05:00'::TIMESTAMPTZ, 'completed'),
      ('2024 Arnold Classic', 'Classic Physique', 'Classic', '2024-03-02 17:00:00-05:00'::TIMESTAMPTZ, 'completed'),
      ('2024 Texas Pro', 'Men''s Open Bodybuilding', 'Bodybuilding', '2024-08-15 19:00:00-05:00'::TIMESTAMPTZ, 'scheduled')
    ) d(show_name, name, category, start_time, status)
WHERE s.name = d.show_name;

-- Seed Athletes
INSERT INTO athletes (first_name, last_name, residency, nationality, country_code, date_of_birth, gender) VALUES
-- Open Bodybuilding Athletes
('Hadi', 'Choopan', 'Iran', 'Iranian', 'IRN', '1987-03-26', 'Male'),
('Derek', 'Lunsford', 'Indiana', 'American', 'USA', '1988-06-15', 'Male'),
('Samson', 'Dauda', 'England', 'British', 'GBR', '1987-07-08', 'Male'),
('Andrew', 'Jacked', 'Nigeria', 'Nigerian', 'NGA', '1987-11-15', 'Male'),
('Brandon', 'Curry', 'Tennessee', 'American', 'USA', '1982-09-10', 'Male'),
('Nick', 'Walker', 'New Jersey', 'American', 'USA', '1994-03-18', 'Male'),
('Blessing', 'Awodibu', 'Ireland', 'Irish', 'IRL', '1993-08-22', 'Male'),
('Antoine', 'Vaillant', 'Canada', 'Canadian', 'CAN', '1987-11-20', 'Male'),

-- Classic Athletes
('Chris', 'Bumstead', 'Canada', 'Canadian', 'CAN', '1995-02-02', 'Male'),
('Urs', 'Kalecinski', 'Poland', 'Polish', 'POL', '1997-01-15', 'Male'),
('Ramon', 'Rocha', 'Brazil', 'Brazilian', 'BRA', '1991-05-20', 'Male'),
('Mike', 'Sommerfeld', 'Germany', 'German', 'GER', '1994-11-13', 'Male'),
('Wesley', 'Vissers', 'Netherlands', 'Dutch', 'NLD', '1993-05-06', 'Male'),
('Breon', 'Ansley', 'California', 'American', 'USA', '1981-06-15', 'Male'),

-- Women's Figure Athletes
('Erin', 'Banks', 'California', 'American', 'USA', '1989-04-18', 'Female'),
('Jessica', 'Reyes Padilla', 'Mexico', 'Mexican', 'MEX', '1990-04-15', 'Female'),
('Angela', 'Yeo', 'Singapore', 'Singaporean', 'SGP', '1988-07-22', 'Female'),
('Whitney', 'Jones', 'Texas', 'American', 'USA', '1988-03-10', 'Female'),
('Cydney', 'Gillon', 'Florida', 'American', 'USA', '1991-09-15', 'Female'),
('Missy', 'Farr', 'California', 'American', 'USA', '1987-11-05', 'Female');

-- Seed Division Participants with proper division references
WITH inserted_athletes AS (
    SELECT id, first_name, last_name
    FROM athletes
    WHERE first_name IN (
        'Hadi', 'Derek', 'Samson', 'Andrew', 'Brandon',  'Nick', 'Blessing', 'Antoine',
        'Ramon', 'Chris', 'Urs', 'Breon', 'Mike', 'Wesley',
        'Erin', 'Jessica', 'Angela', 'Whitney', 'Cydney', 'Missy'
    )
),
division_refs AS (
    SELECT d.id, d.name, s.name as show_name
    FROM divisions d
    JOIN shows s ON d.show_id = s.id
)
INSERT INTO division_participants (division_id, athlete_id, status)
SELECT 
    d.id,
    a.id,
    CASE 
        WHEN d.show_name = '2024 Arnold Classic' THEN 'fulfilled'::division_participant_status
        ELSE 'registered'::division_participant_status
    END
FROM inserted_athletes a
CROSS JOIN division_refs d
WHERE 
    -- Mr. Olympia Men's Open Bodybuilding
    (a.first_name IN ('Hadi', 'Derek', 'Samson', 'Andrew', 'Brandon', 'Nick', 'Blessing', 'Antoine') 
        AND d.name = 'Men''s Open Bodybuilding' AND d.show_name = '2024 Mr. Olympia') OR
    
    -- Men's Classic
    (a.first_name IN ('Chris', 'Urs', 'Ramon', 'Breon', 'Mike', 'Wesley') 
        AND d.name = 'Classic Physique' AND d.show_name = '2024 Mr. Olympia') OR
    
    -- Arnold Classic Athletes
    (a.first_name IN ('Chris', 'Urs', 'Ramon', 'Breon', 'Mike', 'Wesley') 
        AND (
            (d.name = 'Men''s Open Bodybuilding' AND d.show_name = '2024 Arnold Classic') OR
            (a.first_name = 'Chris' AND d.name = 'Classic Physique' AND d.show_name = '2024 Arnold Classic')
        )) OR
    
    -- Mr. Olympia Women's Figure
    (a.first_name IN ('Erin', 'Jessica', 'Angela', 'Whitney', 'Cydney', 'Missy') 
        AND d.name = 'Women''s Figure' AND d.show_name = '2024 Mr. Olympia');

-- Seed Bet Types
WITH inserted_bet_types AS (
    INSERT INTO bet_types (name, description) VALUES
    ('Win', 'Bet on athlete to win first place'),
    ('Place', 'Bet on athlete to finish in top 2'),
    ('Show', 'Bet on athlete to finish in top 3')
    RETURNING id, name
)
-- Seed Betting Limits using returned bet type IDs
INSERT INTO betting_limits (bet_type_id, min_bet, max_bet, max_payout, currency_code)
SELECT 
    id,
    CASE name
        WHEN 'Win' THEN 10.00
        WHEN 'Place' THEN 10.00
        WHEN 'Show' THEN 10.00
    END,
    CASE name
        WHEN 'Win' THEN 1000.00
        WHEN 'Place' THEN 800.00
        WHEN 'Show' THEN 500.00
    END,
    CASE name
        WHEN 'Win' THEN 10000.00
        WHEN 'Place' THEN 8000.00
        WHEN 'Show' THEN 5000.00
    END,
    'GBP'
FROM inserted_bet_types;

-- Seed Initial Odds for Mr. Olympia Open Division participants
WITH olympia_participants AS (
    SELECT dp.id as dp_id, a.first_name
    FROM division_participants dp
    JOIN athletes a ON dp.athlete_id = a.id
    JOIN divisions d ON dp.division_id = d.id
    JOIN shows s ON d.show_id = s.id
    WHERE s.name = '2024 Mr. Olympia' 
    AND d.name = 'Men''s Open Bodybuilding'
)
INSERT INTO odds (division_participant_id, bet_type_id, odds_value, timestamp)
SELECT 
    op.dp_id,
    bt.id,
    CASE 
        WHEN bt.name = 'Win' THEN 
            CASE op.first_name
                WHEN 'Derek' THEN 2.50   -- Top contender
                WHEN 'Hadi' THEN 2.75    -- Previous winner
                WHEN 'Samson' THEN 3.00  -- Strong competitor
                WHEN 'Brandon' THEN 4.50 -- Previous champion
                WHEN 'Andrew' THEN 5.00  -- Rising star
                WHEN 'Antoine' THEN 9.00   -- Consistent performer
                WHEN 'Nick' THEN 5.50    -- Young, powerful
                WHEN 'Blessing' THEN 7.00 -- Newcomer with potential
            END
        WHEN bt.name = 'Place' THEN 
            CASE op.first_name
                WHEN 'Derek' THEN 1.75
                WHEN 'Hadi' THEN 1.85
                WHEN 'Samson' THEN 2.00
                WHEN 'Brandon' THEN 2.25
                WHEN 'Andrew' THEN 2.50
                WHEN 'Antoine' THEN 3.00
                WHEN 'Nick' THEN 2.40
                WHEN 'Blessing' THEN 2.70
            END
        WHEN bt.name = 'Show' THEN 
            CASE op.first_name
                WHEN 'Derek' THEN 1.40
                WHEN 'Hadi' THEN 1.45
                WHEN 'Samson' THEN 1.50
                WHEN 'Brandon' THEN 1.60
                WHEN 'Andrew' THEN 1.70
                WHEN 'Antoine' THEN 1.75
                WHEN 'Nick' THEN 1.55
                WHEN 'Blessing' THEN 1.80
            END
    END,
    CURRENT_TIMESTAMP
FROM olympia_participants op
CROSS JOIN bet_types bt;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Remove odds first since they reference division_participants
DELETE FROM odds 
WHERE division_participant_id IN (
    SELECT dp.id 
    FROM division_participants dp
    JOIN divisions d ON dp.division_id = d.id
    JOIN shows s ON d.show_id = s.id
    WHERE s.name IN ('2024 Mr. Olympia', '2024 Arnold Classic', '2024 Texas Pro')
);

-- Remove betting limits
DELETE FROM betting_limits 
WHERE bet_type_id IN (
    SELECT id FROM bet_types 
    WHERE name IN ('Win', 'Place', 'Show')
);

-- Remove bet types
DELETE FROM bet_types 
WHERE name IN ('Win', 'Place', 'Show');

-- Remove division participants
DELETE FROM division_participants 
WHERE division_id IN (
    SELECT d.id 
    FROM divisions d
    JOIN shows s ON d.show_id = s.id
    WHERE s.name IN ('2024 Mr. Olympia', '2024 Arnold Classic', '2024 Texas Pro')
);

-- Remove athletes
DELETE FROM athletes 
WHERE first_name IN ('Hadi', 'Derek', 'Samson', 'Chris', 'Erin');

-- Remove divisions
DELETE FROM divisions 
WHERE show_id IN (
    SELECT id FROM shows 
    WHERE name IN ('2024 Mr. Olympia', '2024 Arnold Classic', '2024 Texas Pro')
);

-- Remove shows
DELETE FROM shows 
WHERE name IN ('2024 Mr. Olympia', '2024 Arnold Classic', '2024 Texas Pro');
-- +goose StatementEnd