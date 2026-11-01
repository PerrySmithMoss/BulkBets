-- +goose Up
-- Correct the original demo fixture only; leave custom schedules untouched.
-- Official weekend: https://mrolympia.com/content/olympia-returning-vegas
-- Division times remain illustrative demo data.
UPDATE shows SET start_time = '2024-10-10 10:00:00-07:00', end_time = '2024-10-13 22:00:00-07:00'
WHERE name = '2024 Mr. Olympia' AND start_time = '2024-09-26 10:00:00-07:00' AND end_time = '2024-09-28 22:00:00-07:00';
UPDATE divisions SET start_time = start_time + INTERVAL '15 days'
WHERE show_id IN (SELECT id FROM shows WHERE name = '2024 Mr. Olympia')
AND start_time IN ('2024-09-27 19:00:00-07:00', '2024-09-27 17:00:00-07:00', '2024-09-26 15:00:00-07:00');

-- +goose Down
UPDATE shows SET start_time = '2024-09-26 10:00:00-07:00', end_time = '2024-09-28 22:00:00-07:00'
WHERE name = '2024 Mr. Olympia' AND start_time = '2024-10-10 10:00:00-07:00' AND end_time = '2024-10-13 22:00:00-07:00';
UPDATE divisions SET start_time = start_time - INTERVAL '15 days'
WHERE show_id IN (SELECT id FROM shows WHERE name = '2024 Mr. Olympia')
AND start_time IN ('2024-10-12 19:00:00-07:00', '2024-10-12 17:00:00-07:00', '2024-10-11 15:00:00-07:00');
