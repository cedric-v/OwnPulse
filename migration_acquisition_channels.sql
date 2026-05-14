-- Migration: Create acquisition_channels table
CREATE TABLE IF NOT EXISTS acquisition_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_channels TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE acquisition_channels ENABLE ROW LEVEL SECURITY;

-- Public access policy
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'acquisition_channels' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON acquisition_channels FOR ALL USING (true);
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
