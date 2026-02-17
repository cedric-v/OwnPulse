-- Migration: Enhance Offers Table
-- Description: Adds columns for detailed offer management (Type, Work Time, Goals, Terms)

ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS unit_cost decimal(12,2) default 0,
ADD COLUMN IF NOT EXISTS work_time jsonb default '[]'::jsonb, -- Array of { activity: string, hours: number, per_sale: boolean }
ADD COLUMN IF NOT EXISTS sales_goals jsonb default '[]'::jsonb, -- Array of { year: number, monthly_counts: number[] }
ADD COLUMN IF NOT EXISTS payment_terms jsonb default '{}'::jsonb; -- Object { mode: string, delay: string, installments: number }

-- Add default values for existing rows if needed (optional)
UPDATE offers SET type = 'Other' WHERE type IS NULL;
