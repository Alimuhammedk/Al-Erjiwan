-- Tests for 0005_order_changes.sql. Paste into Supabase > SQL Editor > New query > Run, AFTER running 0005_order_changes.sql.
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
  p_role text, p_items jsonb, p_gov text default 'بغداد', p_phone text default '07701234567', p_name text default 'علي حسين',
  p_city text default 'الكفل', p_landmark text default 'قرب الجامع', p_address text default ''
) returns text language plpgsql as $$
declare v_code text; v_prev text := current_user;
begin
  execute format('set local role %I', p_role);
  begin
    v_code := public.place_order(p_name, p_phone, p_gov, p_city, p_address, p_landmark, null, p_items);
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
update public.delivery_zones set fee = 5000 where governorate_ar = 'بغداد';
insert into public.products (id, name_ar, base_price, stock, is_active, is_tintable) values
  ('a0000000-0000-4000-8000-000000000001', 'منتج بسيط', 10000, 10, true, false),
  ('a0000000-0000-4000-8000-000000000004', 'دهان مخلوط', 50000, 0, true, true);
insert into public.product_variants (id, product_id, size_label, price, stock) values
  ('d1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', '4 لتر', 50000, 10);

create function pg_temp.stock(p uuid) returns int language sql as $$ select stock from public.products where id = p $$;
create function pg_temp.st(p_id uuid, p_status text) returns void language sql as $$ select public.set_order_status(p_id, p_status) $$;

-- ---------- 1. any status to any status, stock follows ----------
do $$
declare v_a uuid := 'a0000000-0000-4000-8000-000000000001'; v_id uuid; v_code text; s text; i int;
begin
  perform pg_temp.as_admin();
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 3)));
  perform pg_temp.check(v_code !~ '^ERR', 'order works: ' || v_code);
  select id into v_id from public.orders where code = v_code;
  perform pg_temp.check(pg_temp.stock(v_a) = 7, 'order took 3');
  perform pg_temp.st(v_id, 'cancelled');
  perform pg_temp.check(pg_temp.stock(v_a) = 10, 'cancel gave 3 back');
  perform pg_temp.st(v_id, 'new');
  perform pg_temp.check(pg_temp.stock(v_a) = 7, 'reopening took 3 again');
  for i in 1..5 loop
    perform pg_temp.st(v_id, 'cancelled'); perform pg_temp.st(v_id, 'new');
  end loop;
  perform pg_temp.check(pg_temp.stock(v_a) = 7, 'many cancel/reopen rounds never change the total');
  foreach s in array array['confirmed','shipped','delivered','returned','cancelled','delivered','new','returned','confirmed'] loop
    perform pg_temp.st(v_id, s);
  end loop;
  perform pg_temp.check((select status from public.orders where id = v_id) = 'confirmed', 'ended on confirmed');
  perform pg_temp.check(pg_temp.stock(v_a) = 7, 'stock is 7 for an active order');
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'confirmed'), 'INVALID_TRANSITION');
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'bogus'), 'INVALID_INPUT');
  perform pg_temp.expect_err(format('select public.set_order_status(%L, %L)', v_id, 'new'), 'FORBIDDEN', 'authenticated', '{"email":"someone@else.com"}');
exception when others then raise exception '[section 1] %', sqlerrm;
end $$;

-- ---------- 2. returned keeps mixed paint out of stock; moving between cancelled and returned balances ----------
do $$
declare v_a uuid := 'a0000000-0000-4000-8000-000000000001'; v_t uuid := 'a0000000-0000-4000-8000-000000000004'; v_d uuid := 'd1000000-0000-4000-8000-000000000001';
        v_id uuid; v_code text; v_s int; v_ds int;
begin
  perform pg_temp.as_admin();
  select stock into v_s from public.products where id = v_a;
  select stock into v_ds from public.product_variants where id = v_d;
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 1), pg_temp.line(v_t, 2, v_d, '٤٢٠')));
  select id into v_id from public.orders where code = v_code;
  perform pg_temp.st(v_id, 'delivered');
  perform pg_temp.st(v_id, 'returned');
  perform pg_temp.check(pg_temp.stock(v_a) = v_s, 'returned ready-made is back');
  perform pg_temp.check((select stock from public.product_variants where id = v_d) = v_ds - 2, 'returned mixed paint is not back');
  perform pg_temp.st(v_id, 'cancelled');
  perform pg_temp.check((select stock from public.product_variants where id = v_d) = v_ds, 'cancelled gives mixed paint back');
  perform pg_temp.st(v_id, 'returned');
  perform pg_temp.check((select stock from public.product_variants where id = v_d) = v_ds - 2, 'back to returned takes it again');
  perform pg_temp.check(pg_temp.stock(v_a) = v_s, 'ready-made unchanged by cancelled/returned moves');
  perform pg_temp.st(v_id, 'new');
  perform pg_temp.check(pg_temp.stock(v_a) = v_s - 1 and (select stock from public.product_variants where id = v_d) = v_ds - 2, 'reopening takes the rest');
exception when others then raise exception '[section 2] %', sqlerrm;
end $$;

-- ---------- 3. reopening a sold-out item is refused and changes nothing ----------
do $$
declare v_a uuid := 'a0000000-0000-4000-8000-000000000001'; v_id uuid; v_code text; v_mv int; v_msg text;
begin
  perform pg_temp.as_admin();
  update public.products set stock = 2 where id = v_a;
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 2)));
  select id into v_id from public.orders where code = v_code;
  perform pg_temp.st(v_id, 'cancelled');
  update public.products set stock = 1 where id = v_a;
  select count(*) into v_mv from public.stock_movements;
  begin
    perform pg_temp.st(v_id, 'new');
    raise exception 'TEST FAILED: the reopen should have been refused';
  exception when others then v_msg := sqlerrm;
  end;
  perform pg_temp.check(v_msg = 'OUT_OF_STOCK:منتج بسيط', 'the refusal names the product: ' || v_msg);
  perform pg_temp.check((select status from public.orders where id = v_id) = 'cancelled', 'the status did not change');
  perform pg_temp.check(pg_temp.stock(v_a) = 1 and (select count(*) from public.stock_movements) = v_mv, 'stock and history did not change');
exception when others then raise exception '[section 3] %', sqlerrm;
end $$;

-- ---------- 4. deleting orders ----------
do $$
declare v_a uuid := 'a0000000-0000-4000-8000-000000000001'; v_id uuid; v_code text; s text; v_before int;
begin
  perform pg_temp.as_admin();
  update public.products set stock = 10 where id = v_a;
  foreach s in array array['new','confirmed','shipped'] loop
    v_before := pg_temp.stock(v_a);
    v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 2)));
    select id into v_id from public.orders where code = v_code;
    if s <> 'new' then perform pg_temp.st(v_id, s); end if;
    perform public.delete_order(v_id);
    perform pg_temp.check(pg_temp.stock(v_a) = v_before, 'deleting a ' || s || ' order returned its stock');
    perform pg_temp.check(not exists (select 1 from public.orders where id = v_id) and not exists (select 1 from public.order_items where order_id = v_id), 'the ' || s || ' order is gone');
    perform pg_temp.expect_err(format('select public.delete_order(%L)', v_id), 'NOT_FOUND');
  end loop;
  foreach s in array array['cancelled','returned','delivered'] loop
    v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 2)));
    select id into v_id from public.orders where code = v_code;
    perform pg_temp.st(v_id, s);
    v_before := pg_temp.stock(v_a);
    perform public.delete_order(v_id);
    perform pg_temp.check(pg_temp.stock(v_a) = v_before, 'deleting a ' || s || ' order changes no stock');
  end loop;
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 1)));
  select id into v_id from public.orders where code = v_code;
  perform pg_temp.expect_err(format('select public.delete_order(%L)', v_id), 'FORBIDDEN', 'authenticated', '{"email":"someone@else.com"}');
  perform pg_temp.expect_err(format('select public.delete_order(%L)', v_id), 'permission denied', 'anon');
  perform pg_temp.check(exists (select 1 from public.orders where id = v_id), 'a refused delete kept the order');
exception when others then raise exception '[section 4] %', sqlerrm;
end $$;

-- ---------- 5. city and landmark are required; the address is made from them ----------
do $$
declare v_code text; v_items jsonb := jsonb_build_array(jsonb_build_object('product_id', 'a0000000-0000-4000-8000-000000000001', 'quantity', 1));
        v_o public.orders;
begin
  perform pg_temp.check(pg_temp.order_as('anon', v_items, 'بغداد', '07701234567', 'علي حسين', '') = 'ERR:INVALID_INPUT', 'no city is refused');
  perform pg_temp.check(pg_temp.order_as('anon', v_items, 'بغداد', '07701234567', 'علي حسين', 'ك') = 'ERR:INVALID_INPUT', 'a one-letter city is refused');
  perform pg_temp.check(pg_temp.order_as('anon', v_items, 'بغداد', '07701234567', 'علي حسين', 'الكفل', '') = 'ERR:INVALID_INPUT', 'no landmark is refused');
  v_code := pg_temp.order_as('anon', v_items);
  perform pg_temp.check(v_code !~ '^ERR', 'a normal order works: ' || v_code);
  select * into v_o from public.orders where code = v_code;
  perform pg_temp.check(v_o.address = 'الكفل - قرب الجامع' and v_o.city = 'الكفل' and v_o.landmark = 'قرب الجامع', 'the address is made from city and landmark: ' || v_o.address);
exception when others then raise exception '[section 5] %', sqlerrm;
end $$;

-- ---------- 6. delivery companies ----------
do $$
declare v_c uuid; v_zone uuid; v_id uuid; v_code text; v_a uuid := 'a0000000-0000-4000-8000-000000000001';
begin
  perform pg_temp.as_admin();
  select id into v_zone from public.delivery_zones where governorate_ar = 'بغداد';
  perform pg_temp.expect_err($q$insert into public.delivery_companies (name, whatsapp) values ('شركة', '12345')$q$, 'whatsapp');
  perform pg_temp.expect_err($q$insert into public.delivery_companies (name, whatsapp) values ('ش', '07701234567')$q$, 'name');
  insert into public.delivery_companies (name, whatsapp) values ('شركة السرعة', '07701234567') returning id into v_c;
  insert into public.delivery_company_prices (company_id, zone_id, price) values (v_c, v_zone, 4000);
  perform pg_temp.expect_err(format('insert into public.delivery_company_prices (company_id, zone_id, price) values (%L, %L, -1)', v_c, v_zone), 'price');
  v_code := pg_temp.order_as('anon', jsonb_build_array(pg_temp.line(v_a, 1)));
  select id into v_id from public.orders where code = v_code;
  update public.orders set delivery_company_id = v_c, delivery_company = 'شركة السرعة', delivery_cost = 4000 where id = v_id;
  delete from public.delivery_companies where id = v_c;
  perform pg_temp.check((select delivery_company_id from public.orders where id = v_id) is null, 'the order lost the link');
  perform pg_temp.check((select delivery_company from public.orders where id = v_id) = 'شركة السرعة' and (select delivery_cost from public.orders where id = v_id) = 4000, 'but kept the name and cost');
  perform pg_temp.check(not exists (select 1 from public.delivery_company_prices where company_id = v_c), 'prices went with the company');
  perform pg_temp.expect_err('select * from public.delivery_companies', 'permission denied', 'anon');
  perform pg_temp.expect_err('select * from public.delivery_company_prices', 'permission denied', 'anon');
  perform pg_temp.check(public.track_order(v_code, '07701234567') ->> 'delivery_company' = 'شركة السرعة', 'tracking shows the company name');
  perform pg_temp.check(not (public.track_order(v_code, '07701234567') ? 'tracking_note'), 'and no tracking note');
exception when others then raise exception '[section 6] %', sqlerrm;
end $$;

-- ---------- 7. dashboard ----------
do $$
declare r jsonb; v_sum int;
begin
  perform pg_temp.as_admin();
  r := public.dashboard_stats();
  perform pg_temp.check(r ?& array['by_status', 'stock_summary'], 'new dashboard fields exist');
  perform pg_temp.check((r->'by_status') ?& array['new','confirmed','shipped','delivered','cancelled','returned'], 'by_status has all six keys');
  select sum(v::int) into v_sum from jsonb_each_text(r->'by_status') as t(k, v);
  perform pg_temp.check(v_sum = (select count(*) from public.orders), 'status counts add up to all orders');
  perform pg_temp.check((r->'stock_summary'->>'available')::int + (r->'stock_summary'->>'low')::int + (r->'stock_summary'->>'out')::int
    = (select count(*) from public.products p where p.is_active and not exists (select 1 from public.product_variants v where v.product_id = p.id))
    + (select count(*) from public.product_variants), 'stock summary counts every product and size once');
exception when others then raise exception '[section 7] %', sqlerrm;
end $$;

rollback;
select 'ALL PASSED' as result;
