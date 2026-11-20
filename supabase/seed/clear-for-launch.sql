-- CLEARS THE STORE FOR LAUNCH. Permanent. Run once in Supabase > SQL Editor > New query > Run, right before handing the shop to Ali.
-- Deletes: all orders and their items, all stock history, all products (with their sizes, photos and colour choices),
-- all categories, banners, colours and articles.
-- Keeps: delivery fees, store settings and saved messages, the four pages, and the admin accounts.
-- Pictures already uploaded to Supabase Storage stay there (delete them in Storage > images if you want the space back).

begin;
delete from public.orders;           -- also removes order_items
delete from public.stock_movements;
delete from public.products;         -- also removes sizes, photos and product_colours
delete from public.categories;
delete from public.banners;
delete from public.colours;
delete from public.articles;
commit;
