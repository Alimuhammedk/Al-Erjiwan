-- Table permissions. New Supabase projects don't grant these automatically.
-- Row-level security (0001) still decides which rows each person can see or change.
-- Paste into Supabase > SQL Editor > New query > Run.

grant usage on schema public to anon, authenticated;

-- The public can only read storefront tables (never orders or admins).
grant select on
  public.categories, public.colours, public.settings, public.product_images,
  public.products, public.product_variants, public.banners, public.delivery_zones
to anon;

-- Logged-in users get table access; the "admin all" policies limit it to admins.
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
