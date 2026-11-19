-- Tests for 0004_orders.sql. Paste into Supabase > SQL Editor > New query > Run, AFTER running 0004_orders.sql.
-- Everything happens inside a transaction that ends in ROLLBACK, so no data is left behind.
-- If every check passes, the last result says ALL PASSED. If one fails, you get a "TEST FAILED" message that
-- says which one.

begin;

-- ---------- helpers (they disappear at the end) ----------
create function pg_temp.check(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'TEST FAILED: %', p_msg; end if;
end $$;

-- Places an order as a given database role (anon = a visitor) and returns the code, or 'ERR:' + the error.
create function pg_temp.order_as(
  p_role text, p_items jsonb, p_gov text default 'بغداد', p_phone text default '07701234567', p_name text default 'علي حسين'
) returns text language plpgsql as $$
declare v_code text; v_prev text := current_user;
begin
  execute format('set local role %I', p_role);
  begin
    v_code := public.place_order(p_name, p_phone, p_gov, 'الكفل', 'شارع الجامعة قرب المدرسة', 'قرب الجامع', null, p_items);
    execute format('set local role %I', v_prev);
    return v_code;
  exception when others then
    execute format('set local role %I', v_prev);
    return 'ERR:' || sqlerrm;
  end;
end $$;

-- Places an order as a visitor and expects it to be refused with an error starting with p_expect.
create function pg_temp.expect_refused(p_label text, p_expect text, p_items jsonb, p_gov text default 'بغداد',
                                       p_phone text default '07701234567', p_name text default 'علي حسين')
returns void language plpgsql as $$
declare v text;
begin
  v := pg_temp.order_as('anon', p_items, p_gov, p_phone, p_name);
  perform pg_temp.check(v like p_expect || '%', p_label || ': expected ' || p_expect || ' but got ' || v);
end $$;

-- Runs a statement as a role and expects it to fail with an error containing p_expected.
create function pg_temp.expect_err(p_sql text, p_expected text, p_role text default 'postgres', p_claims text default null)
returns void language plpgsql as $$
declare v_prev text := current_user;
begin
  begin
    if p_role <> 'postgres' then execute format('set local role %I', p_role); end if;
    if p_claims is not null then perform set_config('request.jwt.claims', p_claims, true); end if;
    execute p_sql;
  exception when others then
    execute format('set local role %I', v_prev);
    if sqlerrm like '%' || p_expected || '%' then return; end if;
    raise exception 'TEST FAILED: wrong error for [%]: %', p_sql, sqlerrm;
  end;
  execute format('set local role %I', v_prev);
  raise exception 'TEST FAILED: expected error "%" for [%] but it worked', p_expected, p_sql;
end $$;

-- Runs a statement as a role and expects it to WORK.
create function pg_temp.expect_ok(p_sql text, p_role text default 'postgres') returns void language plpgsql as $$
declare v_prev text := current_user;
begin
  if p_role <> 'postgres' then execute format('set local role %I', p_role); end if;
  execute p_sql;
  execute format('set local role %I', v_prev);
end $$;

create function pg_temp.as_admin() returns void language sql as $$
  select set_config('request.jwt.claims', '{"email":"mhmdkbyhanly@gmail.com"}', true)
$$;

create function pg_temp.line(p_product uuid, p_qty int, p_variant uuid default null, p_note text default null) returns jsonb
language sql as $$
  select jsonb_strip_nulls(jsonb_build_object('product_id', p_product, 'variant_id', p_variant, 'colour_note', p_note, 'quantity', p_qty))
$$;

-- ---------- fixtures ----------
insert into public.colours (id, name_ar, code, hex) values ('f0000000-0000-4000-8000-000000000001', 'كريمي', 'JW-102', '#F3E9D2');
update public.delivery_zones set fee = 5000 where governorate_ar = 'بغداد';
update public.delivery_zones set fee = 8000, min_order = 20000 where governorate_ar = 'البصرة';
update public.delivery_zones set is_active = false where governorate_ar = 'أربيل';

insert into public.products (id, name_ar, base_price, sale_price, stock, is_active, is_tintable) values
  ('a0000000-0000-4000-8000-000000000001', 'منتج بسيط', 10000, 8000, 3, true, false),
  ('a0000000-0000-4000-8000-000000000002', 'منتج مخفي', 10000, null, 5, false, false),
  ('a0000000-0000-4000-8000-000000000003', 'منتج بأحجام', 18000, null, 0, true, false),
  ('a0000000-0000-4000-8000-000000000004', 'دهان مخلوط', 50000, null, 0, true, true),
  ('a0000000-0000-4000-8000-000000000005', 'دهان جاهز بألوان', 20000, null, 0, true, false);
insert into public.product_variants (id, product_id, size_label, price, stock, colour_id) values
  ('c1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', '1 لتر', 18000, 1, null),
  ('c1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', '4 لتر', 60000, 5, null),
  ('d1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', '4 لتر', 50000, 10, null),
  ('e1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', '4 لتر', 20000, 4, 'f0000000-0000-4000-8000-000000000001');

-- ---------- 1. a tampered price is ignored ----------
do $$
declare v_code text; v_o public.orders;
begin
  v_code := pg_temp.order_as('anon', jsonb_build_array(
    jsonb_build_object('product_id', 'a0000000-0000-4000-8000-000000000001', 'quantity', 1, 'price', 1, 'unit_price', 1, 'total', 1, 'delivery_fee', 0)));
  perform pg_temp.check(v_code !~ '^ERR', 'a normal order should work: ' || v_code);
  select * into v_o from public.orders where code = v_code;
  perform pg_temp.check(v_o.subtotal = 8000, 'the sale price (8000) is used, not the browser price; got ' || v_o.subtotal);
  perform pg_temp.check(v_o.delivery_fee = 5000 and v_o.total = 13000, 'the fee comes from the zone and total = subtotal + fee; got ' || v_o.total);
  perform pg_temp.check(v_o.phone = '07701234567' and v_o.status = 'new' and v_o.payment_method = 'cod', 'phone, status and payment are set');
  perform pg_temp.check((select unit_price from public.order_items where order_id = v_o.id) = 8000, 'item price is the database price');
  perform pg_temp.check((select stock from public.products where id = 'a0000000-0000-4000-8000-000000000001') = 2, 'stock dropped from 3 to 2');
  perform pg_temp.check((select delta from public.stock_movements where order_id = v_o.id) = -1, 'the movement was logged');
exception when others then
  raise exception '[section 1] %', sqlerrm;
end $$;

-- ---------- 2. the last unit can be bought once ----------
do $$
declare v1 text; v2 text;
begin
  v1 := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line('a0000000-0000-4000-8000-000000000003', 1, 'c1000000-0000-4000-8000-000000000001')));
  perform pg_temp.check(v1 !~ '^ERR', 'the first buyer gets the last unit: ' || v1);
  v2 := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line('a0000000-0000-4000-8000-000000000003', 1, 'c1000000-0000-4000-8000-000000000001')));
  perform pg_temp.check(v2 = 'ERR:OUT_OF_STOCK:منتج بأحجام', 'the second buyer is refused: ' || v2);
  perform pg_temp.check((select stock from public.product_variants where id = 'c1000000-0000-4000-8000-000000000001') = 0, 'size stock is 0');
  perform pg_temp.check((select stock from public.products where id = 'a0000000-0000-4000-8000-000000000003') = 5, 'product stock follows its sizes (0 + 5)');
exception when others then
  raise exception '[section 2] %', sqlerrm;
end $$;

-- ---------- 3. bad orders are refused and change nothing ----------
do $$
declare
  v_orders int; v_stock int;
  p_simple constant text := 'a0000000-0000-4000-8000-000000000001';
  p_hidden constant text := 'a0000000-0000-4000-8000-000000000002';
  p_sized  constant text := 'a0000000-0000-4000-8000-000000000003';
  p_tinted constant text := 'a0000000-0000-4000-8000-000000000004';
  v_size1  constant text := 'c1000000-0000-4000-8000-000000000001'; -- size of p_sized, stock 0 by now
  v_size2  constant text := 'c1000000-0000-4000-8000-000000000002';
  v_tint   constant text := 'd1000000-0000-4000-8000-000000000001';
begin
  select count(*) into v_orders from public.orders;
  select stock into v_stock from public.products where id = p_simple::uuid;

  perform pg_temp.expect_refused('quantity 0', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', 0)));
  perform pg_temp.expect_refused('quantity -1', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', -1)));
  perform pg_temp.expect_refused('quantity 100', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', 100)));
  perform pg_temp.expect_refused('quantity 1.5', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', 1.5)));
  perform pg_temp.expect_refused('quantity text', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', 'abc')));
  perform pg_temp.expect_refused('hidden product', 'ERR:PRODUCT_UNAVAILABLE', jsonb_build_array(jsonb_build_object('product_id', p_hidden, 'quantity', 1)));
  perform pg_temp.expect_refused('unknown product', 'ERR:PRODUCT_UNAVAILABLE', jsonb_build_array(jsonb_build_object('product_id', 'a0000000-0000-4000-8000-0000000000ff', 'quantity', 1)));
  perform pg_temp.expect_refused('not a uuid', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', 'xyz', 'quantity', 1)));
  perform pg_temp.expect_refused('size of another product', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', p_tinted, 'variant_id', v_size2, 'quantity', 1, 'colour_note', '12')));
  perform pg_temp.expect_refused('size given for a product without sizes', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'variant_id', v_size2, 'quantity', 1)));
  perform pg_temp.expect_refused('size missing', 'ERR:SIZE_REQUIRED', jsonb_build_array(jsonb_build_object('product_id', p_sized, 'quantity', 1)));
  perform pg_temp.expect_refused('tinted without colour', 'ERR:COLOUR_REQUIRED', jsonb_build_array(jsonb_build_object('product_id', p_tinted, 'variant_id', v_tint, 'quantity', 1)));
  perform pg_temp.expect_refused('unknown governorate', 'ERR:ZONE_INVALID', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', 1)), 'غير موجودة');
  perform pg_temp.expect_refused('switched-off governorate', 'ERR:ZONE_INVALID', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', 1)), 'أربيل');
  perform pg_temp.expect_refused('below the minimum order', 'ERR:MIN_ORDER', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', 1)), 'البصرة');
  perform pg_temp.expect_refused('empty list', 'ERR:EMPTY_CART', '[]'::jsonb);
  perform pg_temp.expect_refused('not a list', 'ERR:EMPTY_CART', '{}'::jsonb);
  perform pg_temp.expect_refused('51 lines', 'ERR:INVALID_INPUT', (select jsonb_agg(jsonb_build_object('product_id', p_simple, 'quantity', 1)) from generate_series(1, 51)));
  perform pg_temp.expect_refused('bad phone', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', 1)), 'بغداد', '12345');
  perform pg_temp.expect_refused('name too short', 'ERR:INVALID_INPUT', jsonb_build_array(jsonb_build_object('product_id', p_simple, 'quantity', 1)), 'بغداد', '07701234567', 'ع');
  perform pg_temp.expect_refused('second line sold out undoes the first', 'ERR:OUT_OF_STOCK', jsonb_build_array(
    jsonb_build_object('product_id', p_simple, 'quantity', 1),
    jsonb_build_object('product_id', p_sized, 'variant_id', v_size1, 'quantity', 1)));

  perform pg_temp.check((select count(*) from public.orders) = v_orders, 'a refused order must not create an order row');
  perform pg_temp.check((select stock from public.products where id = p_simple::uuid) = v_stock, 'a refused order must not change stock');
exception when others then
  raise exception '[section 3] %', sqlerrm;
end $$;

-- ---------- 4. the order keeps a snapshot of what was bought ----------
do $$
declare v_code text; v_i public.order_items;
begin
  -- a ready-made colour comes from the size, whatever the browser says
  v_code := pg_temp.order_as('anon', jsonb_build_array(
    jsonb_build_object('product_id','a0000000-0000-4000-8000-000000000005','variant_id','e1000000-0000-4000-8000-000000000001','colour_id','f0000000-0000-4000-8000-0000000000aa','quantity',2)));
  perform pg_temp.check(v_code !~ '^ERR', 'ready-made colour order works: ' || v_code);
  select oi.* into v_i from public.order_items oi join public.orders o on o.id = oi.order_id where o.code = v_code;
  perform pg_temp.check(v_i.product_name = 'دهان جاهز بألوان' and v_i.size_label = '4 لتر', 'name and size are saved');
  perform pg_temp.check(v_i.colour_name = 'كريمي' and v_i.colour_code = 'JW-102', 'colour name and code are saved from the size');
  perform pg_temp.check(v_i.quantity = 2 and v_i.unit_price = 20000, 'quantity and price are saved');
  perform pg_temp.check((select stock from public.product_variants where id = 'e1000000-0000-4000-8000-000000000001') = 2, 'size stock dropped by 2');
  -- a tinted product takes a typed colour code
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line('a0000000-0000-4000-8000-000000000004', 1, 'd1000000-0000-4000-8000-000000000001', '  ٤٢٠  ')));
  perform pg_temp.check(v_code !~ '^ERR', 'tinted order with a typed colour works: ' || v_code);
  select oi.* into v_i from public.order_items oi join public.orders o on o.id = oi.order_id where o.code = v_code;
  perform pg_temp.check(v_i.colour_note = '٤٢٠', 'the typed colour is trimmed and saved');
exception when others then
  raise exception '[section 4] %', sqlerrm;
end $$;

-- ---------- 5. status changes and giving stock back ----------
do $$
declare v_code text; v_id uuid; v_a uuid := 'a0000000-0000-4000-8000-000000000001'; v_d uuid := 'd1000000-0000-4000-8000-000000000001';
        v_before int; v_dbefore int;
begin
  perform pg_temp.as_admin();

  -- cancel: stock comes back, once
  select stock into v_before from public.products where id = v_a;
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 2)));
  select id into v_id from public.orders where code = v_code;
  perform pg_temp.check((select stock from public.products where id = v_a) = v_before - 2, 'stock dropped for the order');
  perform public.set_order_status(v_id, 'cancelled');
  perform pg_temp.check((select stock from public.products where id = v_a) = v_before, 'cancelling gave the stock back');
  perform pg_temp.check((select stock_restored from public.orders where id = v_id), 'the order remembers its stock was restored');
  perform pg_temp.check((select delta from public.stock_movements where order_id = v_id and reason = 'cancel') = 2, 'the cancel was logged');
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'cancelled'), 'INVALID_TRANSITION');
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'new'), 'INVALID_TRANSITION');
  perform pg_temp.check((select stock from public.products where id = v_a) = v_before, 'a second cancel does not add stock again');

  -- return: ready-made goes back, mixed (tinted) paint does not
  select stock into v_before from public.products where id = v_a;
  select stock into v_dbefore from public.product_variants where id = v_d;
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 1), pg_temp.line('a0000000-0000-4000-8000-000000000004', 1, v_d, '٤٢٠')));
  select id into v_id from public.orders where code = v_code;
  perform public.set_order_status(v_id, 'confirmed');
  perform public.set_order_status(v_id, 'shipped');
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'cancelled'), 'INVALID_TRANSITION');
  perform public.set_order_status(v_id, 'returned');
  perform pg_temp.check((select stock from public.products where id = v_a) = v_before, 'the returned ready-made product is back in stock');
  perform pg_temp.check((select stock from public.product_variants where id = v_d) = v_dbefore - 1, 'returned mixed paint is NOT put back');
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'delivered'), 'INVALID_TRANSITION');

  -- a delivered order can be returned but not cancelled
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 1)));
  select id into v_id from public.orders where code = v_code;
  perform public.set_order_status(v_id, 'delivered');
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'cancelled'), 'INVALID_TRANSITION');
  perform public.set_order_status(v_id, 'returned');

  -- not an admin
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'new'), 'FORBIDDEN', 'authenticated', '{"email":"someone@else.com"}');
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'new'), 'permission denied', 'anon');
exception when others then
  raise exception '[section 5] %', sqlerrm;
end $$;

-- ---------- 6. manual stock changes (the shop sells from the same stock) ----------
do $$
declare v_a uuid := 'a0000000-0000-4000-8000-000000000001'; v_e uuid := 'a0000000-0000-4000-8000-000000000005';
        v_ev uuid := 'e1000000-0000-4000-8000-000000000001'; v_c uuid := 'a0000000-0000-4000-8000-000000000003'; v_s int;
begin
  perform pg_temp.as_admin();
  select stock into v_s from public.products where id = v_a;
  perform pg_temp.check(public.adjust_stock(v_a, null, 10, 'manual', 'وصلت كمية') = v_s + 10, 'adding stock returns the new number');
  perform pg_temp.check((select by_email from public.stock_movements where reason = 'manual' and note = 'وصلت كمية') = 'mhmdkbyhanly@gmail.com', 'the movement records who did it');
  perform pg_temp.check(public.adjust_stock(v_a, null, -2, 'shop_sale', null) = v_s + 8, 'a shop sale lowers stock');
  perform pg_temp.check(exists (select 1 from public.stock_movements where reason = 'shop_sale' and delta = -2), 'the shop sale was logged');
  perform pg_temp.expect_err(format('select public.adjust_stock(%L, null, -100000, %L, null)', v_a, 'manual'), 'NEGATIVE_STOCK');
  perform pg_temp.expect_err(format('select public.adjust_stock(%L, null, 1, %L, null)', v_a, 'order'), 'INVALID_INPUT');
  perform pg_temp.expect_err(format('select public.adjust_stock(%L, null, 0, %L, null)', v_a, 'manual'), 'INVALID_INPUT');
  perform pg_temp.expect_err(format('select public.adjust_stock(%L, null, 1, %L, null)', v_c, 'manual'), 'INVALID_INPUT'); -- has sizes: adjust a size instead
  perform public.adjust_stock(v_e, v_ev, 5, 'manual', null);
  perform pg_temp.check((select stock from public.product_variants where id = v_ev) = 7, 'a size adjusts');
  perform pg_temp.check((select stock from public.products where id = v_e) = 7, 'and its product follows');
  perform pg_temp.expect_err(format('select public.adjust_stock(%L, null, 1, %L, null)', v_a, 'manual'), 'FORBIDDEN', 'authenticated', '{"email":"someone@else.com"}');
exception when others then
  raise exception '[section 6] %', sqlerrm;
end $$;

-- ---------- 7. customers can follow an order without seeing other people's data ----------
do $$
declare v_code text; r jsonb; p text;
begin
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line('a0000000-0000-4000-8000-000000000001', 1)), 'بغداد', '+964 770 123 4567');
  perform pg_temp.check((select phone from public.orders where code = v_code) = '07701234567', 'a +964 phone is stored as 07...');
  foreach p in array array['07701234567', '+9647701234567', '009647701234567', '0770 123 4567', '7701234567', '٠٧٧٠١٢٣٤٥٦٧'] loop
    r := public.track_order(v_code, p);
    perform pg_temp.check(r is not null and r->>'status' = 'new', 'tracking works with the phone typed as ' || p);
  end loop;
  perform pg_temp.check(public.track_order(lower(v_code), '07701234567') is not null, 'the code is not case sensitive');
  perform pg_temp.check(public.track_order(v_code, '07709999999') is null, 'wrong phone gives nothing');
  perform pg_temp.check(public.track_order(v_code, 'abc') is null, 'garbage phone gives nothing');
  perform pg_temp.check(public.track_order('ZZZZZZZZ', '07701234567') is null, 'wrong code gives nothing');
  r := public.track_order(v_code, '07701234567');
  perform pg_temp.check(not (r ? 'phone') and not (r ? 'address') and not (r ? 'customer_name'), 'tracking shows no personal data');
  perform pg_temp.check(jsonb_array_length(r->'items') = 1 and (r->'items'->0->>'name') = 'منتج بسيط', 'tracking lists the items');
  r := public.order_summary(v_code);
  perform pg_temp.check(r->>'status' = 'new' and (r->>'total')::int = 13000 and not (r ? 'phone'), 'the summary has status and total, no personal data');
  perform pg_temp.check(public.order_summary('ZZZZZZZZ') is null, 'unknown code gives nothing');
  -- a visitor can call both
  perform pg_temp.expect_ok(format('select public.track_order(%L, %L)', v_code, '07701234567'), 'anon');
  perform pg_temp.expect_ok(format('select public.order_summary(%L)', v_code), 'anon');
exception when others then
  raise exception '[section 7] %', sqlerrm;
end $$;

-- ---------- 8. a product's stock follows its sizes ----------
do $$
declare v_c uuid := 'a0000000-0000-4000-8000-000000000003';
begin
  update public.product_variants set stock = 7 where id = 'c1000000-0000-4000-8000-000000000002';
  perform pg_temp.check((select stock from public.products where id = v_c) = 7, 'editing a size updates the product (0 + 7)');
  insert into public.product_variants (product_id, size_label, price, stock) values (v_c, '18 لتر', 220000, 3);
  perform pg_temp.check((select stock from public.products where id = v_c) = 10, 'adding a size updates the product');
  delete from public.product_variants where product_id = v_c and size_label = '18 لتر';
  perform pg_temp.check((select stock from public.products where id = v_c) = 7, 'deleting a size updates the product');
exception when others then
  raise exception '[section 8] %', sqlerrm;
end $$;

-- ---------- 9. the dashboard numbers ----------
do $$
declare r jsonb;
begin
  perform pg_temp.as_admin();
  r := public.dashboard_stats();
  perform pg_temp.check(r ?& array['new_orders', 'orders_today', 'sales_today', 'sales_month', 'out_of_stock', 'low_stock', 'best_sellers'], 'all dashboard fields are there');
  perform pg_temp.check((r->>'new_orders')::int = (select count(*) from public.orders where status = 'new'), 'new orders are counted');
  perform pg_temp.check((r->>'sales_today')::numeric = (select coalesce(sum(total), 0) from public.orders
    where status not in ('cancelled', 'returned') and created_at >= date_trunc('day', now() at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad'),
    'sales leave out cancelled and returned orders');
  perform pg_temp.check(exists (select 1 from jsonb_array_elements(r->'low_stock') e where e->>'name' = 'منتج بأحجام' and e->>'size' = '1 لتر'), 'an empty size shows in the low stock list');
  perform pg_temp.check((r->>'out_of_stock')::int >= 1, 'out of stock items are counted');
  perform pg_temp.check(jsonb_typeof(r->'best_sellers') = 'array', 'best sellers is a list');
  perform pg_temp.expect_err('select public.dashboard_stats()', 'FORBIDDEN', 'authenticated', '{"email":"someone@else.com"}');
exception when others then
  raise exception '[section 9] %', sqlerrm;
end $$;

-- ---------- 10. visitors can't read private tables ----------
do $$
begin
  perform pg_temp.expect_err('select * from public.orders', 'permission denied', 'anon');
  perform pg_temp.expect_err('select * from public.order_items', 'permission denied', 'anon');
  perform pg_temp.expect_err('select * from public.stock_movements', 'permission denied', 'anon');
exception when others then
  raise exception '[section 10] %', sqlerrm;
end $$;

rollback;
select 'ALL PASSED' as result;
