-- Which colours a mixed-paint product offers: every catalogue colour (the default), or only the chosen ones.
-- Paste this whole file into Supabase > SQL Editor > New query > Run (once). Then run supabase/tests/0007_product_colours_test.sql.

alter table public.products add column all_colours boolean not null default true;

create table public.product_colours (
  product_id uuid not null references public.products (id) on delete cascade,
  colour_id uuid not null references public.colours (id) on delete cascade,
  primary key (product_id, colour_id)
);
create index product_colours_colour_idx on public.product_colours (colour_id);

alter table public.product_colours enable row level security;
create policy "public read" on public.product_colours for select using (true);
create policy "admin all" on public.product_colours for all using (public.is_admin()) with check (public.is_admin());
grant select on public.product_colours to anon;
grant select, insert, update, delete on public.product_colours to authenticated;
