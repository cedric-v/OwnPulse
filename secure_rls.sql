-- Cleanup ANY existing policies for these tables (both old and temporary)
DROP POLICY IF EXISTS "Enable all access for now" ON contacts;
DROP POLICY IF EXISTS "Enable all access for now" ON tasks;
DROP POLICY IF EXISTS "authenticated_access" ON contacts;
DROP POLICY IF EXISTS "authenticated_access" ON tasks;
DROP POLICY IF EXISTS "Temporary import access" ON contacts;
DROP POLICY IF EXISTS "Temporary import access tasks" ON tasks;
DROP POLICY IF EXISTS "Temporary select access" ON contacts;
DROP POLICY IF EXISTS "Temporary select access tasks" ON tasks;

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create secure policies (Authenticated users only)
CREATE POLICY "authenticated_access" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_access" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
