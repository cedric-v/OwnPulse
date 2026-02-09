-- Add 'list' column to contacts table
alter table contacts add column if not exists list text default 'Prospect';

-- Check if status column needs adjustment or if we just overwrite it during re-seed
-- We will re-seed, so data migration isn't strictly necessary, but schema must exist.
