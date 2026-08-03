-- Generic Seed Data for repository
-- This file contains neutral data to avoid exposing private business offers.
-- Rows are assigned to the first created user (owner) when one exists.

INSERT INTO offers (name, default_price) VALUES
('Service Gold', 1000),
('Service Silver', 500),
('Maintenance Option', 250)
ON CONFLICT (name) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('currency', 'CHF')
ON CONFLICT (key) DO NOTHING;

-- Assign seeded rows to the first user (owner) if not already owned.
DO $$
DECLARE v_owner uuid := (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
BEGIN
    IF v_owner IS NOT NULL THEN
        UPDATE offers SET user_id = v_owner WHERE user_id IS NULL;
        UPDATE settings SET user_id = v_owner WHERE user_id IS NULL;
    END IF;
END $$;
