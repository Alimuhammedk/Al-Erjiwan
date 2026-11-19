-- Room and finish fields for the shop filters. Safe to run once; no data is changed or removed.
-- Paste into Supabase > SQL Editor > New query > Run.
alter table public.products add column finish text;
alter table public.products add column rooms text[] not null default '{}';
