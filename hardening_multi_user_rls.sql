-- ============================================================================
-- OwnPulse — Multi-user hardening (user_id ownership + auth.uid() policies)
-- Run AFTER hardening_security_rls.sql, once per project.
--
-- Design:
--   * Every row gets a user_id (owning Supabase auth user).
--   * Tables written ONLY by the dashboard (authenticated) are strictly
--     private: user_id NOT NULL, default auth.uid(), RLS scoped to the owner.
--   * `contacts` keeps NULL user_id for rows captured by the anonymous
--     extension ("unclaimed"). Any authenticated user can see and edit
--     unclaimed contacts; the first edit claims them (user_id set). Once
--     claimed, only the owner sees them.
--   * Anonymous capture no longer INSERTs directly into contacts: it calls
--     capture_contact(jsonb), a SECURITY DEFINER function that only accepts
--     whitelisted fields and always creates an unclaimed (user_id NULL) row.
--
-- Backfill note: existing rows are assigned to the FIRST auth user created
-- (the current owner). Adapt the SELECT if you already have several users.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) contacts — nullable user_id (anon capture), claim-on-edit semantics
-- ----------------------------------------------------------------------------
alter table public.contacts add column if not exists user_id uuid references auth.users(id);

update public.contacts set user_id = (select id from auth.users order by created_at limit 1)
where user_id is null;

drop policy if exists "authenticated_access" on public.contacts;
drop policy if exists "authenticated_full_access" on public.contacts;
drop policy if exists "anon_capture_read" on public.contacts;
drop policy if exists "anon_capture_insert" on public.contacts;

create policy "owner_or_unclaimed_select" on public.contacts
  for select to authenticated using (user_id = auth.uid() or user_id is null);
create policy "owner_or_unclaimed_insert" on public.contacts
  for insert to authenticated with check (user_id = auth.uid() or user_id is null);
create policy "owner_claim_update" on public.contacts
  for update to authenticated using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);
create policy "owner_or_unclaimed_delete" on public.contacts
  for delete to authenticated using (user_id = auth.uid() or user_id is null);

-- Anonymous capture is now only possible via the capture_contact() RPC below.
revoke insert on public.contacts from anon;

create index if not exists idx_contacts_user_id on public.contacts(user_id);

-- Whitelisted capture entry point (extension /rest/v1/rpc/capture_contact).
-- SECURITY DEFINER: only inserts, only the whitelisted columns, always an
-- unclaimed (user_id NULL) row. No read/update/delete exposed.
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
    p_payload->>'list', (p_payload->>'value')::numeric, p_payload->>'phone',
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
-- 2) companies, tasks — strictly private
-- ----------------------------------------------------------------------------
alter table public.companies add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.tasks    add column if not exists user_id uuid references auth.users(id) default auth.uid();

update public.companies set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.tasks    set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;

alter table public.companies alter column user_id set not null;
alter table public.tasks    alter column user_id set not null;

drop policy if exists "authenticated_access" on public.companies;
drop policy if exists "authenticated_access" on public.tasks;
drop policy if exists "authenticated_full_access" on public.companies;
drop policy if exists "authenticated_full_access" on public.tasks;

create policy "owner_full_access" on public.companies for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_companies_user_id on public.companies(user_id);
create index if not exists idx_tasks_user_id on public.tasks(user_id);

-- ----------------------------------------------------------------------------
-- 3) settings, offers, acquisition_channels, sales, expenses — strictly private
-- ----------------------------------------------------------------------------
alter table public.settings             add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.offers               add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.acquisition_channels add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.sales                add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.expenses             add column if not exists user_id uuid references auth.users(id) default auth.uid();

update public.settings             set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.offers               set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.acquisition_channels set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.sales                set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.expenses             set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;

alter table public.settings             alter column user_id set not null;
alter table public.offers               alter column user_id set not null;
alter table public.acquisition_channels alter column user_id set not null;
alter table public.sales                alter column user_id set not null;
alter table public.expenses             alter column user_id set not null;

drop policy if exists "authenticated_full_access" on public.settings;
drop policy if exists "authenticated_full_access" on public.offers;
drop policy if exists "authenticated_full_access" on public.acquisition_channels;
drop policy if exists "authenticated_full_access" on public.sales;
drop policy if exists "authenticated_full_access" on public.expenses;

create policy "owner_full_access" on public.settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.offers
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.acquisition_channels
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.sales
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on public.expenses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_settings_user_id             on public.settings(user_id);
create index if not exists idx_offers_user_id               on public.offers(user_id);
create index if not exists idx_acquisition_channels_user_id on public.acquisition_channels(user_id);
create index if not exists idx_sales_user_id                on public.sales(user_id);
create index if not exists idx_expenses_user_id             on public.expenses(user_id);
