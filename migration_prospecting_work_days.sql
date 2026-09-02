-- Prospecting work days setting
--
-- Days counted toward prospecting goals, stored as a comma-separated list of
-- ISO day numbers (1 = Monday … 7 = Sunday). Default: Monday to Friday.
-- Configured from Dashboard > Réglages, next to the daily prospecting goal.
--
-- Idempotent: inserts the default only if the key does not exist yet.
-- The row is attributed to the first created user (same backfill pattern as
-- fix_missing_tables.sql) so it passes the owner-scoped RLS policy.

insert into settings (key, value, user_id)
select 'prospecting_work_days', '1,2,3,4,5', (select id from auth.users order by created_at limit 1)
where not exists (select 1 from settings where key = 'prospecting_work_days');
