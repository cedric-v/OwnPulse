-- TEMPORARY: Open the DB for data restoration
DROP POLICY IF EXISTS "authenticated_access" ON contacts;
DROP POLICY IF EXISTS "authenticated_access" ON tasks;
DROP POLICY IF EXISTS "Temporary select/insert access" ON contacts;
DROP POLICY IF EXISTS "Temporary select/insert access" ON tasks;

CREATE POLICY "Temporary access" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Temporary access" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- Ensure RLS is enabled but these policies override
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
