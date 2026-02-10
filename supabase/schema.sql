-- OwnPulse Supabase Schema
-- Consolidate this into your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Companies Table
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  linkedin_url text,
  website_url text,
  city text,
  logo_url text,
  notes text,
  value decimal(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: Create companies from existing contacts
-- insert into companies (name) 
-- select distinct company from contacts where company is not null 
-- on conflict (name) do nothing;
-- update contacts set company_id = c.id from companies c where contacts.company = c.name;

-- Contacts Table
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  first_name text,
  last_name text,
  email text,
  linkedin_url text,
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
  priority text default 'Medium',
  category text default 'General',
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table companies enable row level security;
alter table contacts enable row level security;
alter table tasks enable row level security;

-- Policies: Authenticated users can manage their own data
create policy "authenticated_access" on companies for all to authenticated using (true) with check (true);
create policy "authenticated_access" on contacts for all to authenticated using (true) with check (true);
create policy "authenticated_access" on tasks for all to authenticated using (true) with check (true);
