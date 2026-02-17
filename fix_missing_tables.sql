-- Database expansion for Settings and Offers
-- Run this in your Supabase SQL Editor

-- Settings table for global configuration
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offers table for product/service management
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    default_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default currency if not exists
INSERT INTO settings (key, value) VALUES ('currency', 'CHF') 
ON CONFLICT (key) DO NOTHING;

-- Initial offers migration (Generic for Git)
INSERT INTO offers (name, default_price) VALUES 
('Service Premium', 1000),
('Conseil Stratégique', 500),
('Support Mensuel', 250)
ON CONFLICT (name) DO NOTHING;

-- RLS Policies (Enable for all authenticated users)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Simple policies for rapid development (per project style)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON settings FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON offers FOR ALL USING (true);
    END IF;
END $$;
