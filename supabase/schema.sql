-- ===================================================================
-- CForm Creator — Supabase schema. Run this in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- Safe to re-run.
-- ===================================================================

-- 1) FORMS: one row per form the user builds. `data` holds all the
--    editable content (text, links, theme, photo) as JSON.
create table if not exists public.forms (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2) LEADS: every form submission, tagged with which form it came from.
create table if not exists public.leads (
  id          bigint generated always as identity primary key,
  form_slug   text,
  form_title  text,
  name        text,
  phone       text,
  email       text,
  answers     jsonb default '{}'::jsonb,
  admin_notes text,                          -- Lead Center note (admin only)
  tags        jsonb default '[]'::jsonb,     -- Lead Center tags  (admin only)
  created_at  timestamptz default now()
);

-- If you ran an earlier version, add the new columns:
alter table public.leads add column if not exists form_slug   text;
alter table public.leads add column if not exists form_title  text;
alter table public.leads add column if not exists admin_notes text;
alter table public.leads add column if not exists tags        jsonb default '[]'::jsonb;

-- ===================================================================
-- Row Level Security
-- ===================================================================
alter table public.forms enable row level security;
alter table public.leads enable row level security;

-- FORMS: anyone may READ (public form pages need it); only signed-in
-- admins may create / change / delete.
drop policy if exists "anyone can read forms" on public.forms;
create policy "anyone can read forms"
  on public.forms for select to anon, authenticated using (true);

drop policy if exists "admins manage forms" on public.forms;
create policy "admins manage forms"
  on public.forms for all to authenticated using (true) with check (true);

-- LEADS: anyone (the public form) may INSERT; only admins read / delete.
drop policy if exists "public can insert leads" on public.leads;
create policy "public can insert leads"
  on public.leads for insert to anon, authenticated with check (true);

drop policy if exists "admins can read leads" on public.leads;
create policy "admins can read leads"
  on public.leads for select to authenticated using (true);

drop policy if exists "admins can delete leads" on public.leads;
create policy "admins can delete leads"
  on public.leads for delete to authenticated using (true);

drop policy if exists "admins can update leads" on public.leads;
create policy "admins can update leads"
  on public.leads for update to authenticated using (true) with check (true);
