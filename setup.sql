-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Contacts Table
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  first_name text,
  last_name text,
  email text,
  linkedin_url text,
  company text,
  company_role text,
  status text default 'Prospect',
  avatar_url text,
  notes text, -- Stores HTML notes from migration or simple text
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks Table
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  due_date timestamptz,
  contact_id uuid references contacts(id) on delete cascade,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table contacts enable row level security;
alter table tasks enable row level security;

-- Open RLS policies for MVP (Service Role will bypass, but good to have basics)
-- WARNING: For production, restricted policies should be applied.
create policy "Enable all access for now" on contacts for all using (true) with check (true);
create policy "Enable all access for now" on tasks for all using (true) with check (true);
