-- Add threads_url and instagram_url columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS threads_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Update existing data: if linkedin_url contains threads or instagram, move it (optional, but requested by user's screenshot)
UPDATE contacts 
SET threads_url = linkedin_url, linkedin_url = NULL 
WHERE linkedin_url LIKE '%threads.com%' OR linkedin_url LIKE '%threads.net%';

UPDATE contacts 
SET instagram_url = linkedin_url, linkedin_url = NULL 
WHERE linkedin_url LIKE '%instagram.com%';
