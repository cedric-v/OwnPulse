-- ============================================================================
-- OwnPulse — Security hardening (RLS / least privilege / GDPR-LPD)
-- Run once in the Supabase SQL Editor.
-- After applying, also do the dashboard settings (not possible via SQL):
--   - Authentication > Providers > Email > "Allow new users to sign up" = OFF
--   - Enable 2FA (MFA) on your account
--   - Review API keys (rotate the legacy anon key if it was ever shared)
--
-- Effect:
--   1. `anon` can no longer read personal columns from `contacts`
--      (only a minimal `contact_urls` view with social URLs for dedup).
--   2. `anon` loses all access to settings / offers / acquisition_channels /
--      sales / expenses (financial & config data). Authenticated only.
--   3. Extension behavior is preserved: dedup uses the view, capture still
--      INSERTs into `contacts` with the anon key.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) contacts — stop anonymous SELECT on the full table
--    The extension only needs URL-based dedup: expose a minimal view instead.
-- ----------------------------------------------------------------------------
revoke select on public.contacts from anon;

-- Minimal view: id + social URLs only (enough for the extension dedup query).
-- Plain views are readable if the caller has SELECT on the view; RLS of the
-- underlying table does not apply to non-security_invoker views, so the view
-- is deliberately the ONLY anonymous read path.
create or replace view public.contact_urls as
select id, linkedin_url, threads_url, instagram_url
from public.contacts;

revoke all on public.contact_urls from public;
grant select on public.contact_urls to anon;

-- Keep anonymous INSERT for the extension capture path.
-- (Optional future hardening: replace with a SECURITY DEFINER RPC so anon can
--  only insert whitelisted fields.)

-- ----------------------------------------------------------------------------
-- 2) settings / offers / acquisition_channels / sales / expenses
--    Anonymous full CRUD  ->  authenticated only
-- ----------------------------------------------------------------------------
revoke all on public.settings from anon;
revoke all on public.offers from anon;
revoke all on public.acquisition_channels from anon;
revoke all on public.sales from anon;
revoke all on public.expenses from anon;
revoke all on public.companies from anon;
revoke all on public.tasks from anon;

-- Recreate policies with an explicit `to authenticated` (was "all users").
drop policy if exists "Public Access" on public.settings;
create policy "authenticated_full_access" on public.settings
  for all to authenticated using (true) with check (true);

drop policy if exists "Public Access" on public.offers;
create policy "authenticated_full_access" on public.offers
  for all to authenticated using (true) with check (true);

drop policy if exists "Public Access" on public.acquisition_channels;
create policy "authenticated_full_access" on public.acquisition_channels
  for all to authenticated using (true) with check (true);

drop policy if exists "Enable read access for all users" on public.sales;
drop policy if exists "Enable insert access for all users" on public.sales;
drop policy if exists "Enable update access for all users" on public.sales;
drop policy if exists "Enable delete access for all users" on public.sales;
create policy "authenticated_full_access" on public.sales
  for all to authenticated using (true) with check (true);

drop policy if exists "Enable read access for all users" on public.expenses;
drop policy if exists "Enable insert access for all users" on public.expenses;
drop policy if exists "Enable update access for all users" on public.expenses;
drop policy if exists "Enable delete access for all users" on public.expenses;
create policy "authenticated_full_access" on public.expenses
  for all to authenticated using (true) with check (true);

-- contacts: drop the anonymous read policy (view replaces it).
drop policy if exists "anon_capture_read" on public.contacts;

-- ----------------------------------------------------------------------------
-- 3) Optional: multi-user isolation (recommended if >1 account will ever exist)
--    add a `user_id uuid references auth.users(id)` column to every table,
--    default to auth.uid(), and scope policies with using (user_id = auth.uid()).
--    Single-user deployments can safely skip this step.
-- ----------------------------------------------------------------------------
