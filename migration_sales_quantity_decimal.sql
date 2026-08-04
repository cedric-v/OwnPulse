-- Allow fractional quantities in sales (e.g. 3.33 hours at an hourly rate)
-- The quantity column was INTEGER, which rounded any fractional quantity
-- (3.33 -> 3). Widening to NUMERIC keeps existing values intact and lets
-- hourly-rate sales record fractional hours.
ALTER TABLE sales ALTER COLUMN quantity TYPE NUMERIC;
ALTER TABLE sales ALTER COLUMN quantity SET DEFAULT 1;
