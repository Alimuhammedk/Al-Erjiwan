-- Tests for 0010_remove_delivery_companies.sql. Paste into Supabase > SQL Editor > New query > Run, AFTER running 0010.
-- Everything happens inside a transaction that ends in ROLLBACK, so no data is left behind.
-- If every check passes, the last result says ALL PASSED. If one fails, you get a "TEST FAILED" message.

begin;

create function pg_temp.check(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'TEST FAILED: %', p_msg; end if;
end $$;

do $$
declare v_code text; v_t jsonb;
begin
  -- the company tables and order columns are gone
  perform pg_temp.check(to_regclass('public.delivery_companies') is null, 'delivery_companies table is gone');
  perform pg_temp.check(to_regclass('public.delivery_company_prices') is null, 'delivery_company_prices table is gone');
  perform pg_temp.check(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders'
    and column_name in ('delivery_company', 'delivery_company_id', 'delivery_cost', 'delivery_notes', 'internal_note')), 'company columns are gone from orders');

  -- what stays: fees per governorate, the customer's own notes, and ordering still works
  perform pg_temp.check(to_regclass('public.delivery_zones') is not null, 'delivery fees table stays');
  perform pg_temp.check(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'notes'), 'customer notes stay');
  insert into public.delivery_zones (governorate_ar, fee, min_order) values ('محافظة تجريبية', 5000, 0);
  insert into public.products (id, name_ar, base_price, stock) values ('c0000000-0000-4000-8000-000000000001', 'منتج', 10000, 5);
  v_code := public.place_order('زبون', '07701234567', 'محافظة تجريبية', 'الكفل', 'عنوان', 'قرب الجامع', 'ملاحظة الزبون',
    '[{"product_id":"c0000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb);
  perform pg_temp.check(v_code is not null, 'an order can still be placed');
  perform pg_temp.check((select notes from public.orders where code = v_code) = 'ملاحظة الزبون', 'the customer note is kept');

  -- tracking works and has no company name
  v_t := public.track_order(v_code, '07701234567');
  perform pg_temp.check(v_t ->> 'status' = 'new' and (v_t ->> 'total')::int = 15000, 'tracking still shows status and total');
  perform pg_temp.check(not (v_t ? 'delivery_company'), 'tracking has no company name');

  -- saved messages lose their company line
  insert into public.settings (key, value) values ('message_update', E'مرحبًا {name}\nشركة التوصيل: {company}\nشكرًا'), ('message_confirm', '{company}');
  update public.settings
  set value = trim(both E'\n' from regexp_replace(value, E'(^|\\n)[^\\n]*\\{company\\}[^\\n]*', '', 'g'))
  where key in ('message_confirm', 'message_update') and value like '%{company}%';
  delete from public.settings where key in ('message_confirm', 'message_update') and trim(value) = '';
  perform pg_temp.check((select value from public.settings where key = 'message_update') = E'مرحبًا {name}\nشكرًا', 'the company line is taken out of a saved message');
  perform pg_temp.check(not exists (select 1 from public.settings where key = 'message_confirm'), 'a message that was only the company goes back to the built-in text');
end $$;

rollback;
select 'ALL PASSED' as result;
