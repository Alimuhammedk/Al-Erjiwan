-- Removes only the test items added by dummy-data.sql (found by their fixed ids). Your own data is not touched.
-- Paste into Supabase > SQL Editor > New query > Run. Then delete the public/seed folder from the project.

begin;
delete from public.products   where id::text like '00000000-0000-4002-8000-%'; -- also removes their sizes and photos
delete from public.categories where id::text like '00000000-0000-4001-8000-%';
delete from public.colours    where id::text like '00000000-0000-4003-8000-%';
delete from public.banners    where id::text like '00000000-0000-4004-8000-%';
commit;
