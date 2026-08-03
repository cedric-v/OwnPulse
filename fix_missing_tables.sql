-- Database expansion for Settings and Offers
-- Run in your Supabase SQL Editor (one-time migration).
-- Security: anonymous access removed; rows are owner-scoped (user_id).

-- Settings table for global configuration
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated, service_role;

-- Offers table for product/service management
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    default_price NUMERIC NOT NULL DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated, service_role;

-- Insert default currency if not exists
INSERT INTO settings (key, value) VALUES ('currency', 'CHF')
ON CONFLICT (key) DO NOTHING;

-- Initial offers migration (Generic for Git)
INSERT INTO offers (name, default_price) VALUES
('Service Premium', 1000),
('Conseil Stratégique', 500),
('Support Mensuel', 250)
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Owner-scoped policies (idempotent; drops the legacy "Public Access")
DROP POLICY IF EXISTS "Public Access" ON settings;
DROP POLICY IF EXISTS "Public Access" ON offers;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'owner_full_access') THEN
        CREATE POLICY "owner_full_access" ON settings FOR ALL TO authenticated
            USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offers' AND policyname = 'owner_full_access') THEN
        CREATE POLICY "owner_full_access" ON offers FOR ALL TO authenticated
            USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Backfill seeded rows to the first created user (owner) if not already owned.
DO $$
DECLARE v_owner uuid := (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
BEGIN
    IF v_owner IS NOT NULL THEN
        UPDATE settings SET user_id = v_owner WHERE user_id IS NULL;
        UPDATE offers SET user_id = v_owner WHERE user_id IS NULL;
    END IF;
END $$;
