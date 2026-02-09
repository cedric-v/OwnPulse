
-- Update Contacts Table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Update Tasks Table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium', -- Low, Medium, High
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Follow-up'; -- Follow-up, Meeting, Email, Call, Other
