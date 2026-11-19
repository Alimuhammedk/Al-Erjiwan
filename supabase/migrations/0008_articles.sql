-- Short articles for the homepage "مقالات" section, written and edited by the owner.
-- Paste this whole file into Supabase > SQL Editor > New query > Run (once). Then run supabase/tests/0008_articles_test.sql.

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 150),
  excerpt text check (length(excerpt) <= 300),
  body text not null default '' check (length(body) <= 20000),
  cover_url text not null check (length(cover_url) between 1 and 1000),
  images text[] not null default '{}' check (cardinality(images) <= 6),
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index articles_published_idx on public.articles (published_at desc) where is_published;

create function public.articles_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
create trigger articles_touch before update on public.articles for each row execute function public.articles_touch();

alter table public.articles enable row level security;
create policy "public read published" on public.articles for select using (is_published);
create policy "admin all" on public.articles for all using (public.is_admin()) with check (public.is_admin());
grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;
