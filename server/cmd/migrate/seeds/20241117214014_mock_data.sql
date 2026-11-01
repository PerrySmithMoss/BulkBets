-- +goose Up
-- +goose StatementBegin
-- Seed Shows
WITH inserted_shows AS (
  INSERT INTO shows (name, description, location, is_two_day_show, start_time, end_time, status) VALUES
    ('2024 Mr. Olympia', 'The most prestigious professional bodybuilding competition', 'Las Vegas, Nevada', true, '2024-10-10 10:00:00-07:00'::TIMESTAMPTZ, '2024-10-13 22:00:00-07:00'::TIMESTAMPTZ, 'upcoming'),
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
      ('2024 Mr. Olympia', 'Men''s Open Bodybuilding', 'Bodybuilding', '2024-10-12 19:00:00-07:00'::TIMESTAMPTZ, 'scheduled'),
      ('2024 Mr. Olympia', 'Classic Physique', 'Classic', '2024-10-12 17:00:00-07:00'::TIMESTAMPTZ, 'scheduled'),
      ('2024 Mr. Olympia', 'Women''s Figure', 'Figure', '2024-10-11 15:00:00-07:00'::TIMESTAMPTZ, 'scheduled'),
      ('2024 Arnold Classic', 'Men''s Open Bodybuilding', 'Bodybuilding', '2024-03-02 19:00:00-05:00'::TIMESTAMPTZ, 'scheduled'),
      ('2024 Arnold Classic', 'Classic Physique', 'Classic', '2024-03-02 19:00:00-05:00'::TIMESTAMPTZ, 'scheduled'),
      ('2024 Arnold Classic', 'Women''s Wellness', 'Wellness', '2024-03-02 17:00:00-05:00'::TIMESTAMPTZ, 'scheduled'),
      ('2024 Texas Pro', 'Men''s Open Bodybuilding', 'Bodybuilding', '2024-08-15 19:00:00-05:00'::TIMESTAMPTZ, 'completed')
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
('James', 'Hollingshead', 'England', 'British', 'GBR', '1989-03-17', 'Male'),
('Akim', 'Williams', 'Long Island', 'Grenadian', 'GRD', '1984-08-20', 'Male'),
('Rubiel', 'Mosquera', 'Marbella', 'Colombian', 'COL', '1995-01-20', 'Male'),

-- Classic Athletes
('Chris', 'Bumstead', 'Canada', 'Canadian', 'CAN', '1995-02-02', 'Male'),
('Urs', 'Kalecinski', 'Poland', 'Polish', 'POL', '1997-01-15', 'Male'),
('Ramon', 'Rocha', 'Brazil', 'Brazilian', 'BRA', '1991-05-20', 'Male'),
('Mike', 'Sommerfeld', 'Germany', 'German', 'GER', '1994-11-13', 'Male'),
('Wesley', 'Vissers', 'Netherlands', 'Dutch', 'NLD', '1993-05-06', 'Male'),
('Breon', 'Ansley', 'California', 'American', 'USA', '1981-06-15', 'Male'),
('Michael', 'Daboul', 'Kuwait', 'Syria', 'SYR', '1987-06-21', 'Male'),

-- Women's Figure Athletes
('Erin', 'Banks', 'California', 'American', 'USA', '1989-04-18', 'Female'),
('Jessica', 'Reyes Padilla', 'Mexico', 'Mexican', 'MEX', '1990-04-15', 'Female'),
('Angela', 'Yeo', 'Singapore', 'Singaporean', 'SGP', '1988-07-22', 'Female'),
('Whitney', 'Jones', 'Texas', 'American', 'USA', '1988-03-10', 'Female'),
('Cydney', 'Gillon', 'Florida', 'American', 'USA', '1991-09-15', 'Female'),
('Missy', 'Farr', 'California', 'American', 'USA', '1987-11-05', 'Female'),

-- Female Wellness Athletes
('Juliana', 'Esteso', 'São Paulo', 'Brazilian', 'BRA', '1994-02-06', 'Female'),
('Yarishna', 'Ayala', 'San Juan', 'Puerto Rican', 'PRI', '1992-05-09', 'Female'),
('Angela', 'Borges', 'Florianópolis', 'Brazilian', 'BRA', '1988-09-15', 'Female'),
('Isabelle', 'Nunes', 'Rio de Janeiro', 'Brazilian', 'BRA', '1996-11-22', 'Female'),
('Francielle', 'Mattos', 'Curitiba', 'Brazilian', 'BRA', '1990-03-29', 'Female'),
('Cassandre', 'Chaput', 'Montreal', 'Canadian', 'CAN', '1995-07-14', 'Female');

-- Seed Division Participants with proper division references
WITH inserted_athletes AS (
    SELECT id, first_name, last_name
    FROM athletes
    WHERE (first_name = 'Angela' AND last_name = 'Yeo')  -- Women's Figure
       OR (first_name = 'Angela' AND last_name = 'Borges') -- Female Wellness
       OR first_name IN (
        'Hadi', 'Derek', 'Samson', 'Andrew', 'Brandon',  'Nick', 'Blessing', 'Antoine', 'James', 'Akim', 'Rubiel', 
        'Ramon', 'Chris', 'Urs', 'Breon', 'Mike', 'Wesley', 'Michael',
        'Erin', 'Jessica', 'Whitney', 'Cydney', 'Missy',
        'Juliana', 'Yarishna', 'Isabelle', 'Francielle', 'Cassandre'
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
    
    -- Mr. Olympia Men's Classic
    (a.first_name IN ('Chris', 'Urs', 'Ramon', 'Breon', 'Mike', 'Wesley') 
        AND d.name = 'Classic Physique' AND d.show_name = '2024 Mr. Olympia') OR
    
    -- Mr. Olympia Women's Figure
    ((a.first_name = 'Angela' AND a.last_name = 'Yeo') OR 
     a.first_name IN ('Erin', 'Jessica', 'Whitney', 'Cydney', 'Missy')) 
        AND d.name = 'Women''s Figure' AND d.show_name = '2024 Mr. Olympia' OR

    -- Arnold Classic Bodybuilding
    (a.first_name IN ('Hadi', 'Samson', 'Andrew', 'James', 'Akim', 'Antoine') 
        AND d.name = 'Men''s Open Bodybuilding' AND d.show_name = '2024 Arnold Classic') OR

    -- Arnold Classic Classic Physique
    (a.first_name IN ('Urs', 'Breon', 'Wesley', 'Michael') 
        AND d.name = 'Classic Physique' AND d.show_name = '2024 Arnold Classic') OR

    -- Arnold Classic Female Wellness
    ((a.first_name = 'Angela' AND a.last_name = 'Borges') OR 
     a.first_name IN ('Juliana', 'Yarishna', 'Isabelle', 'Francielle', 'Cassandre')) 
        AND d.name = 'Women''s Wellness' AND d.show_name = '2024 Arnold Classic';

-- Seed Betting Limits using returned bet type IDs
INSERT INTO betting_limits (bet_type_id, min_bet, max_bet, max_payout, currency_code)
SELECT 
    id,
    CASE name
        WHEN 'win' THEN 10.00
        WHEN 'place' THEN 10.00
        WHEN 'show' THEN 10.00
    END,
    CASE name
        WHEN 'win' THEN 1000.00
        WHEN 'place' THEN 800.00
        WHEN 'show' THEN 500.00
    END,
    CASE name
        WHEN 'win' THEN 10000.00
        WHEN 'place' THEN 8000.00
        WHEN 'show' THEN 5000.00
    END,
    'GBP'
FROM bet_types bt
WHERE bt.name IN ('win', 'place', 'show');

-- Seed Initial Odds for 2024 Mr. Olympia Open Division participants
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
        WHEN bt.name = 'win' THEN 
            CASE op.first_name
                WHEN 'Derek' THEN 2.50 
                WHEN 'Hadi' THEN 2.75   
                WHEN 'Samson' THEN 3.00
                WHEN 'Brandon' THEN 4.50
                WHEN 'Andrew' THEN 5.00
                WHEN 'Antoine' THEN 9.00
                WHEN 'Nick' THEN 5.50
                WHEN 'Blessing' THEN 7.00
            END
        WHEN bt.name = 'place' THEN 
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
        WHEN bt.name = 'show' THEN 
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
CROSS JOIN bet_types bt
WHERE bt.name IN ('win', 'place', 'show');

-- Seed Initial Odds for 2024 Mr. Olympia Classic Physique division participants
WITH olympia_participants AS (
    SELECT dp.id as dp_id, a.first_name
    FROM division_participants dp
    JOIN athletes a ON dp.athlete_id = a.id
    JOIN divisions d ON dp.division_id = d.id
    JOIN shows s ON d.show_id = s.id
    WHERE s.name = '2024 Mr. Olympia' 
    AND d.name = 'Classic Physique'
)
INSERT INTO odds (division_participant_id, bet_type_id, odds_value, timestamp)
SELECT 
    op.dp_id,
    bt.id,
    CASE 
        WHEN bt.name = 'win' THEN 
            CASE op.first_name
                WHEN 'Chris' THEN 1.67
                WHEN 'Urs' THEN 5.00 
                WHEN 'Ramon' THEN 6.00 
                WHEN 'Breon' THEN 13.00
                WHEN 'Mike' THEN 26.00
                WHEN 'Wesley' THEN 41.00   
            END
        WHEN bt.name = 'place' THEN 
            CASE op.first_name
                WHEN 'Chris' THEN 1.50
                WHEN 'Urs' THEN 4.00
                WHEN 'Ramon' THEN 4.00 
                WHEN 'Breon' THEN 9.00
                WHEN 'Mike' THEN 16.00
                WHEN 'Wesley' THEN 21.00   
            END
        WHEN bt.name = 'show' THEN 
            CASE op.first_name
                WHEN 'Chris' THEN 1.25
                WHEN 'Urs' THEN 2.00
                WHEN 'Ramon' THEN 2.00 
                WHEN 'Breon' THEN 6.00
                WHEN 'Mike' THEN 9.00 
                WHEN 'Wesley' THEN 13.00   
            END
    END,
    CURRENT_TIMESTAMP
FROM olympia_participants op
CROSS JOIN bet_types bt
WHERE bt.name IN ('win', 'place', 'show');

-- Seed Initial Odds for 2024 Mr. Olympia Women's Figure division participants
WITH olympia_participants AS (
    SELECT dp.id as dp_id, a.first_name, a.last_name
    FROM division_participants dp
    JOIN athletes a ON dp.athlete_id = a.id
    JOIN divisions d ON dp.division_id = d.id
    JOIN shows s ON d.show_id = s.id
    WHERE s.name = '2024 Mr. Olympia' 
    AND d.name = 'Women''s Figure'
)
INSERT INTO odds (division_participant_id, bet_type_id, odds_value, timestamp)
SELECT 
    op.dp_id,
    bt.id,
    CASE 
        WHEN bt.name = 'win' THEN 
            CASE 
                WHEN op.first_name = 'Erin' THEN 4.00
                WHEN op.first_name = 'Jessica' THEN 4.00 
                WHEN op.first_name = 'Angela' AND op.last_name = 'Yeo' THEN 8.00
                WHEN op.first_name = 'Whitney' THEN 25.00
                WHEN op.first_name = 'Cydney' THEN 1.50
                WHEN op.first_name = 'Missy' THEN 30.00 
            END
        WHEN bt.name = 'place' THEN 
            CASE 
                WHEN op.first_name = 'Erin' THEN 8.00
                WHEN op.first_name = 'Jessica' THEN 3.00 
                WHEN op.first_name = 'Angela' AND op.last_name = 'Yeo' THEN 6.00
                WHEN op.first_name = 'Whitney' THEN 15.00
                WHEN op.first_name = 'Cydney' THEN 1.20
                WHEN op.first_name = 'Missy' THEN 20.00    
            END
        WHEN bt.name = 'show' THEN 
            CASE 
                WHEN op.first_name = 'Erin' THEN 5.00
                WHEN op.first_name = 'Jessica' THEN 2.50 
                WHEN op.first_name = 'Angela' AND op.last_name = 'Yeo' THEN 4.00
                WHEN op.first_name = 'Whitney' THEN 10.00
                WHEN op.first_name = 'Cydney' THEN 1.10
                WHEN op.first_name = 'Missy' THEN 12.00   
            END
        END,
    CURRENT_TIMESTAMP
FROM olympia_participants op
CROSS JOIN bet_types bt
WHERE bt.name IN ('win', 'place', 'show');

-- Seed Initial Odds for 2024 Arnold Classic Open Division participants
WITH arnold_participants AS (
    SELECT dp.id as dp_id, a.first_name
    FROM division_participants dp
    JOIN athletes a ON dp.athlete_id = a.id
    JOIN divisions d ON dp.division_id = d.id
    JOIN shows s ON d.show_id = s.id
    WHERE s.name = '2024 Arnold Classic' 
    AND d.name = 'Men''s Open Bodybuilding'
)
INSERT INTO odds (division_participant_id, bet_type_id, odds_value, timestamp)
SELECT 
    ac.dp_id,
    bt.id,
    CASE 
        WHEN bt.name = 'win' THEN 
            CASE ac.first_name
                WHEN 'Hadi' THEN 2.75   
                WHEN 'Samson' THEN 3.00
                WHEN 'Andrew' THEN 4.00
                WHEN 'James' THEN 6.00
                WHEN 'Akim' THEN 5.00
                WHEN 'Rubiel' THEN 4.20
                WHEN 'Antoine' THEN 10.00
            END
        WHEN bt.name = 'place' THEN 
            CASE ac.first_name
                WHEN 'Hadi' THEN 1.75   
                WHEN 'Samson' THEN 1.85
                WHEN 'Andrew' THEN 2.00
                WHEN 'James' THEN 2.00
                WHEN 'Akim' THEN 2.00
                WHEN 'Rubiel' THEN 2.50
                WHEN 'Antoine' THEN 2.00
            END
        WHEN bt.name = 'show' THEN 
            CASE ac.first_name
                WHEN 'Hadi' THEN 1.10   
                WHEN 'Samson' THEN 1.10
                WHEN 'Andrew' THEN 1.20
                WHEN 'James' THEN 1.20
                WHEN 'Akim' THEN 1.20
                WHEN 'Rubiel' THEN 1.20
                WHEN 'Antoine' THEN 1.20
            END
    END,
    CURRENT_TIMESTAMP
FROM arnold_participants ac
CROSS JOIN bet_types bt
WHERE bt.name IN ('win', 'place', 'show');

-- Seed Initial Odds for 2024 Arnold Classic Physique division participants
WITH arnold_participants AS (
    SELECT dp.id as dp_id, a.first_name
    FROM division_participants dp
    JOIN athletes a ON dp.athlete_id = a.id
    JOIN divisions d ON dp.division_id = d.id
    JOIN shows s ON d.show_id = s.id
    WHERE s.name = '2024 Arnold Classic' 
    AND d.name = 'Classic Physique'
)
INSERT INTO odds (division_participant_id, bet_type_id, odds_value, timestamp)
SELECT 
    ac.dp_id,
    bt.id,
    CASE 
        WHEN bt.name = 'win' THEN 
            CASE ac.first_name
                WHEN 'Urs' THEN 2.00
                WHEN 'Breon' THEN 3.50 
                WHEN 'Wesley' THEN 2.50
                WHEN 'Michael' THEN 5.00
            END
        WHEN bt.name = 'place' THEN 
            CASE ac.first_name
                WHEN 'Urs' THEN 1.20 
                WHEN 'Breon' THEN 2.20 
                WHEN 'Wesley' THEN 1.40
                WHEN 'Michael' THEN 2.50 
            END
        WHEN bt.name = 'show' THEN 
            CASE ac.first_name
                WHEN 'Urs' THEN 1.30 
                WHEN 'Breon' THEN 1.90 
                WHEN 'Wesley' THEN 1.50
                WHEN 'Michael' THEN 2.10  
            END
    END,
    CURRENT_TIMESTAMP
FROM arnold_participants ac
CROSS JOIN bet_types bt
WHERE bt.name IN ('win', 'place', 'show');

-- Seed Initial Odds for 2024 Arnold Classic Women's Figure division participants
WITH arnold_participants AS (
    SELECT dp.id as dp_id, a.first_name, a.last_name
    FROM division_participants dp
    JOIN athletes a ON dp.athlete_id = a.id
    JOIN divisions d ON dp.division_id = d.id
    JOIN shows s ON d.show_id = s.id
    WHERE s.name = '2024 Arnold Classic' 
    AND d.name = 'Women''s Wellness'
)
INSERT INTO odds (division_participant_id, bet_type_id, odds_value, timestamp)
SELECT 
    ac.dp_id,
    bt.id,
    CASE 
        WHEN bt.name = 'win' THEN 
            CASE 
                WHEN ac.first_name = 'Juliana' THEN 12.00
                WHEN ac.first_name = 'Yarishna' THEN 7.00
                WHEN ac.first_name = 'Angela' AND ac.last_name = 'Borges' THEN 5.00
                WHEN ac.first_name = 'Isabelle' THEN 3.50
                WHEN ac.first_name = 'Francielle' THEN 2.50
                WHEN ac.first_name = 'Cassandre' THEN 15.00
            END
        WHEN bt.name = 'place' THEN 
            CASE 
                WHEN ac.first_name = 'Juliana' THEN 8.00
                WHEN ac.first_name = 'Yarishna' THEN 5.00 
                WHEN ac.first_name = 'Angela' AND ac.last_name = 'Borges' THEN 3.50
                WHEN ac.first_name = 'Isabelle' THEN 2.80
                WHEN ac.first_name = 'Francielle' THEN 1.80
                WHEN ac.first_name = 'Cassandre' THEN 1.20   
            END
        WHEN bt.name = 'show' THEN 
            CASE 
                WHEN ac.first_name = 'Juliana' THEN 6.00
                WHEN ac.first_name = 'Yarishna' THEN 4.00
                WHEN ac.first_name = 'Angela' AND ac.last_name = 'Borges' THEN 2.50
                WHEN ac.first_name = 'Isabelle' THEN 1.20
                WHEN ac.first_name = 'Francielle' THEN 1.10
                WHEN ac.first_name = 'Cassandre' THEN 8.00
        END
    END,
    CURRENT_TIMESTAMP
FROM arnold_participants ac
CROSS JOIN bet_types bt
WHERE bt.name IN ('win', 'place', 'show');

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
    WHERE name IN ('win', 'place', 'show')
);

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
WHERE (first_name, last_name) IN (
    -- Open Bodybuilding Athletes
    ('Hadi', 'Choopan'), 
    ('Derek', 'Lunsford'), 
    ('Samson', 'Dauda'), 
    ('Andrew', 'Jacked'), 
    ('Brandon', 'Curry'), 
    ('Nick', 'Walker'), 
    ('Blessing', 'Awodibu'), 
    ('Antoine', 'Vaillant'), 
    ('James', 'Hollingshead'), 
    ('Akim', 'Williams'), 
    ('Rubiel', 'Mosquera'),

    -- Classic Physique Athletes
    ('Chris', 'Bumstead'), 
    ('Urs', 'Kalecinski'), 
    ('Ramon', 'Rocha'), 
    ('Mike', 'Sommerfeld'), 
    ('Wesley', 'Vissers'), 
    ('Breon', 'Ansley'), 
    ('Michael', 'Daboul'),

    -- Women's Figure Athletes
    ('Erin', 'Banks'), 
    ('Jessica', 'Reyes Padilla'), 
    ('Angela', 'Yeo'), 
    ('Whitney', 'Jones'), 
    ('Cydney', 'Gillon'), 
    ('Missy', 'Farr'),

    -- Female Wellness Athletes
    ('Juliana', 'Esteso'), 
    ('Yarishna', 'Ayala'), 
    ('Angela', 'Borges'), 
    ('Isabelle', 'Nunes'), 
    ('Francielle', 'Mattos'), 
    ('Cassandre', 'Chaput')
);

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