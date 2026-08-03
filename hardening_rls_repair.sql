-- ============================================================================
-- OwnPulse — Consolidated security repair (idempotent)
-- Re-asserts EVERYTHING from hardening_security_rls.sql and
-- hardening_multi_user_rls.sql. Safe to run multiple times.
-- The last two SELECTs print the current policies and grants: run this,
-- then paste the result here so we can confirm the state.
--
-- IMPORTANT: do NOT re-run supabase/schema.sql on an existing project — it
-- re-grants SELECT to anon on contacts and recreates the "anon_capture_read"
-- policy, which re-opens the data exposure.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) contacts — anonymous read/direct-write disabled, view only
-- ----------------------------------------------------------------------------
revoke select, insert, update, delete on public.contacts from anon;
revoke select, insert, update, delete on public.contacts from public;

drop policy if exists "anon_capture_read" on public.contacts;
drop policy if exists "anon_capture_insert" on public.contacts;
drop policy if exists "authenticated_access" on public.contacts;
drop policy if exists "authenticated_full_access" on public.contacts;
drop policy if exists "Public Access" on public.contacts;
drop policy if exists "Enable read access for all users" on public.contacts;

-- Minimal anonymous read path (extension dedup): URLs only.
create or replace view public.contact_urls as
select id, linkedin_url, threads_url, instagram_url
from public.contacts;

revoke all on public.contact_urls from public;
grant select on public.contact_urls to anon;

-- ----------------------------------------------------------------------------
-- 2) all other tables — anonymous access disabled
-- ----------------------------------------------------------------------------
revoke all on public.companies from anon;
revoke all on public.tasks from anon;
revoke all on public.settings from anon;
revoke all on public.offers from anon;
revoke all on public.acquisition_channels from anon;
revoke all on public.sales from anon;
revoke all on public.expenses from anon;

revoke all on public.companies from public;
revoke all on public.tasks from public;
revoke all on public.settings from public;
revoke all on public.offers from public;
revoke all on public.acquisition_channels from public;
revoke all on public.sales from public;
revoke all on public.expenses from public;

-- ----------------------------------------------------------------------------
-- 3) user_id ownership (idempotent)
-- ----------------------------------------------------------------------------
alter table public.contacts add column if not exists user_id uuid references auth.users(id);
alter table public.companies add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.tasks add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.settings add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.offers add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.acquisition_channels add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.sales add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.expenses add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- Backfill: assign current rows to the first created user (the owner).
update public.contacts set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.companies set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.tasks set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.settings set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.offers set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.acquisition_channels set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.sales set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.expenses set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;

-- contacts stays nullable (unclaimed capture rows); the rest must be owned.
alter table public.companies alter column user_id set not null;
alter table public.tasks alter column user_id set not null;
alter table public.settings alter column user_id set not null;
alter table public.offers alter column user_id set not null;
alter table public.acquisition_channels alter column user_id set not null;
alter table public.sales alter column user_id set not null;
alter table public.expenses alter column user_id set not null;

-- ----------------------------------------------------------------------------
-- 4) drop legacy/leaky policies everywhere
-- ----------------------------------------------------------------------------
drop policy if exists "authenticated_access" on public.companies;
drop policy if exists "authenticated_access" on public.tasks;
drop policy if exists "authenticated_full_access" on public.companies;
drop policy if exists "authenticated_full_access" on public.tasks;
drop policy if exists "authenticated_full_access" on public.settings;
drop policy if exists "authenticated_full_access" on public.offers;
drop policy if exists "authenticated_full_access" on public.acquisition_channels;
drop policy if exists "authenticated_full_access" on public.sales;
drop policy if exists "authenticated_full_access" on public.expenses;

drop policy if exists "Public Access" on public.settings;
drop policy if exists "Public Access" on public.offers;
drop policy if exists "Public Access" on public.acquisition_channels;

drop policy if exists "Enable read access for all users" on public.sales;
drop policy if exists "Enable insert access for all users" on public.sales;
drop policy if exists "Enable update access for all users" on public.sales;
drop policy if exists "Enable delete access for all users" on public.sales;
drop policy if exists "Enable read access for all users" on public.expenses;
drop policy if exists "Enable insert access for all users" on public.expenses;
drop policy if exists "Enable update access for all users" on public.expenses;
drop policy if exists "Enable delete access for all users" on public.expenses;

-- ----------------------------------------------------------------------------
-- 5) user-scoped policies (drop first so the script is re-runnable)
-- ----------------------------------------------------------------------------
drop policy if exists "owner_or_unclaimed_select" on public.contacts;
drop policy if exists "owner_or_unclaimed_insert" on public.contacts;
drop policy if exists "owner_claim_update" on public.contacts;
drop policy if exists "owner_or_unclaimed_delete" on public.contacts;
drop policy if exists "owner_full_access" on public.companies;
drop policy if exists "owner_full_access" on public.tasks;
drop policy if exists "owner_full_access" on public.settings;
drop policy if exists "owner_full_access" on public.offers;
drop policy if exists "owner_full_access" on public.acquisition_channels;
drop policy if exists "owner_full_access" on public.sales;
drop policy if exists "owner_full_access" on public.expenses;

create policy "owner_or_unclaimed_select" on public.contacts
  for select to authenticated using (user_id = auth.uid() or user_id is null);
create policy "owner_or_unclaimed_insert" on public.contacts
  for insert to authenticated with check (user_id = auth.uid() or user_id is null);
create policy "owner_claim_update" on public.contacts
  for update to authenticated using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);
create policy "owner_or_unclaimed_delete" on public.contacts
  for delete to authenticated using (user_id = auth.uid() or user_id is null);

create policy "owner_full_access" on public.companies for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.offers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.acquisition_channels for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.sales for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.expenses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6) whitelisted capture RPC (anonymous extension write path)
-- ----------------------------------------------------------------------------
create or replace function public.capture_contact(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.contacts (
    first_name, last_name, email, linkedin_url, threads_url, instagram_url,
    company, company_role, status, list, value, phone, location, website,
    avatar_url, notes
  )
  values (
    p_payload->>'first_name', p_payload->>'last_name', p_payload->>'email',
    p_payload->>'linkedin_url', p_payload->>'threads_url', p_payload->>'instagram_url',
    p_payload->>'company', p_payload->>'company_role', p_payload->>'status',
    p_payload->>'list', (nullif(p_payload->>'value', ''))::numeric, p_payload->>'phone',
    p_payload->>'location', p_payload->>'website', p_payload->>'avatar_url',
    p_payload->>'notes'
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.capture_contact(jsonb) from public;
grant execute on function public.capture_contact(jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7) indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_contacts_user_id on public.contacts(user_id);
create index if not exists idx_companies_user_id on public.companies(user_id);
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_settings_user_id on public.settings(user_id);
create index if not exists idx_offers_user_id on public.offers(user_id);
create index if not exists idx_acquisition_channels_user_id on public.acquisition_channels(user_id);
create index if not exists idx_sales_user_id on public.sales(user_id);
create index if not exists idx_expenses_user_id on public.expenses(user_id);

-- ----------------------------------------------------------------------------
-- 8) DIAGNOSTIC — paste the output here for verification
-- ----------------------------------------------------------------------------
select 'policies' as section, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select 'grants' as section, grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('contacts','companies','tasks','settings','offers','acquisition_channels','sales','expenses')
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;
