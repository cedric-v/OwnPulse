-- Migration: Create acquisition_channels table
-- Security: anonymous access removed; rows are owner-scoped (user_id).

CREATE TABLE IF NOT EXISTS acquisition_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_channels TO authenticated, service_role;

-- Enable RLS
ALTER TABLE acquisition_channels ENABLE ROW LEVEL SECURITY;

-- Owner-scoped policy (idempotent; drops the legacy "Public Access")
DROP POLICY IF EXISTS "Public Access" ON acquisition_channels;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'acquisition_channels' AND policyname = 'owner_full_access') THEN
        CREATE POLICY "owner_full_access" ON acquisition_channels FOR ALL TO authenticated
            USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Initial channels from existing data and user list
INSERT INTO acquisition_channels (name) VALUES
('LinkedIn'),
('Bouche-à-oreille'),
('Réseautage'),
('Instant Académie'),
('Fluance particuliers'),
('Recommandation rémunérée'),
('Instagram'),
('Threads')
ON CONFLICT (name) DO NOTHING;

-- Backfill seeded rows to the first created user (owner) if not already owned.
DO $$
DECLARE v_owner uuid := (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
BEGIN
    IF v_owner IS NOT NULL THEN
        UPDATE acquisition_channels SET user_id = v_owner WHERE user_id IS NULL;
    END IF;
END $$;
