-- Generic Seed Data for repository
-- This file contains neutral data to avoid exposing private business offers

INSERT INTO offers (name, default_price) VALUES 
('Service Gold', 1000),
('Service Silver', 500),
('Maintenance Option', 250)
ON CONFLICT (name) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('currency', 'CHF') 
ON CONFLICT (key) DO NOTHING;
