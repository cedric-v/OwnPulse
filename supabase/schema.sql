-- ============================================================================
-- OwnPulse Supabase Schema — hardened bootstrap
-- For NEW projects only. NEVER re-run this file on an existing project:
-- it is an initialization script. Existing projects are updated with the
-- hardening_*.sql scripts instead.
--
-- Security model (GDPR / LPD friendly, multi-user ready):
--   * All tables are RLS-enabled and owner-scoped (user_id = auth.uid()).
--   * Anonymous (extension) access is minimal and whitelisted:
--       - contact_urls view  -> URL-based dedup only (no emails/phones/notes)
--       - capture_contact()  -> whitelisted INSERT, always unclaimed row
--   * Anon has NO grants on any data table.
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  linkedin_url text,
  website_url text,
  city text,
  logo_url text,
  notes text,
  value decimal(12,2) default 0,
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

grant select, insert, update, delete on public.companies to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Contacts
--   user_id NULL = row captured anonymously by the extension (unclaimed).
--   The first authenticated edit claims it (user_id set); afterwards only
--   the owner sees it.
-- ---------------------------------------------------------------------------
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  first_name text,
  last_name text,
  email text,
  linkedin_url text,
  threads_url text,
  instagram_url text,
  company text, -- Legacy/display name
  company_id uuid references companies(id) on delete set null,
  company_role text,
  status text default 'Prospect',
  list text default 'Prospects', -- Comma separated lists
  value decimal(12,2) default 0,
  phone text,
  location text,
  website text,
  avatar_url text,
  notes text,
  user_id uuid references auth.users(id), -- NULL = unclaimed (anon capture)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

grant select, insert, update, delete on public.contacts to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  due_date timestamptz,
  contact_id uuid references contacts(id) on delete cascade,
  completed boolean default false,
  priority text default 'Medium',
  category text default 'General',
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.tasks to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Prospecting activity history
--   One row per outreach action. This is deliberately separate from the
--   contact's permanent notes and from tasks (future follow-ups).
-- ---------------------------------------------------------------------------
create table contact_activities (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) default auth.uid(),
  channel text not null check (channel in ('LinkedIn', 'Email', 'Phone', 'WhatsApp', 'SMS', 'Instagram', 'Threads', 'Other')),
  outcome text not null check (outcome in ('Message sent', 'Conversation started', 'No response', 'Follow-up needed', 'Meeting booked', 'Not interested', 'Wrong contact', 'Other')),
  note text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.contact_activities to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-scoped
-- ---------------------------------------------------------------------------
alter table companies enable row level security;
alter table contacts enable row level security;
alter table tasks enable row level security;
alter table contact_activities enable row level security;

create policy "owner_full_access" on contact_activities for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner_full_access" on companies for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_full_access" on tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- contacts: claim-on-edit semantics
create policy "owner_or_unclaimed_select" on contacts for select to authenticated
  using (user_id = auth.uid() or user_id is null);
create policy "owner_or_unclaimed_insert" on contacts for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);
create policy "owner_claim_update" on contacts for update to authenticated
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);
create policy "owner_or_unclaimed_delete" on contacts for delete to authenticated
  using (user_id = auth.uid() or user_id is null);

-- ---------------------------------------------------------------------------
-- Anonymous extension access — minimal, whitelisted
-- ---------------------------------------------------------------------------

-- 1) URL-based dedup only (no emails/phones/notes exposed)
create view contact_urls as
select id, linkedin_url, threads_url, instagram_url
from contacts;

revoke all on contact_urls from public;
grant select on contact_urls to anon;

-- 2) Whitelisted capture entry point (extension /rest/v1/rpc/capture_contact)
--    SECURITY DEFINER: only inserts, only whitelisted columns, always an
--    unclaimed (user_id NULL) row. No read/update/delete exposed.
create or replace function capture_contact(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into contacts (
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

revoke all on function capture_contact(jsonb) from public;
grant execute on function capture_contact(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_companies_user_id on companies(user_id);
create index if not exists idx_contacts_user_id on contacts(user_id);
create index if not exists idx_tasks_user_id on tasks(user_id);
create index if not exists idx_contact_activities_contact_id on contact_activities(contact_id);
create index if not exists idx_contact_activities_user_created_at on contact_activities(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- One-time data migration: create companies from existing contacts
-- ---------------------------------------------------------------------------
-- insert into companies (name)
-- select distinct company from contacts where company is not null
-- on conflict (name) do nothing;
-- update contacts set company_id = c.id from companies c where contacts.company = c.name;
