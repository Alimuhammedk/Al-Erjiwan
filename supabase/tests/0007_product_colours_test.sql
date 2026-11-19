-- Tests for 0007_product_colours.sql. Paste into Supabase > SQL Editor > New query > Run, AFTER running 0007_product_colours.sql.
-- Everything happens inside a transaction that ends in ROLLBACK, so no data is left behind.
-- If every check passes, the last result says ALL PASSED. If one fails, you get a "TEST FAILED" message.

begin;

create function pg_temp.check(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'TEST FAILED: %', p_msg; end if;
end $$;

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

insert into public.colours (id, name_ar, hex) values
  ('f0000000-0000-4000-8000-000000000001', 'أزرق', '#0000ff'),
  ('f0000000-0000-4000-8000-000000000002', 'أحمر', '#ff0000');
insert into public.products (id, name_ar, base_price, stock, is_tintable) values
  ('a0000000-0000-4000-8000-000000000001', 'دهان مخلوط', 50000, 0, true),
  ('a0000000-0000-4000-8000-000000000002', 'دهان آخر', 50000, 0, true);

-- ---------- 1. the default, and who may read and write ----------
do $$
begin
  perform pg_temp.check((select all_colours from public.products where id = 'a0000000-0000-4000-8000-000000000001'), 'a product offers every colour by default');
  update public.products set all_colours = false where id = 'a0000000-0000-4000-8000-000000000001';
  insert into public.product_colours values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001');

  set local role anon;
  perform pg_temp.check((select count(*) from public.product_colours) = 1, 'a visitor can read which colours a product offers');
  reset role;
  perform pg_temp.expect_err($q$insert into public.product_colours values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002')$q$, 'permission denied', 'anon');
  perform pg_temp.expect_err($q$delete from public.product_colours$q$, 'permission denied', 'anon');
  perform pg_temp.expect_err($q$insert into public.product_colours values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002')$q$, 'row-level security', 'authenticated', '{"email":"someone@else.com"}');

  perform set_config('request.jwt.claims', '{"email":"mhmdkbyhanly@gmail.com"}', true);
  set local role authenticated;
  insert into public.product_colours values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002');
  reset role;
  perform pg_temp.check((select count(*) from public.product_colours) = 2, 'the admin can add colours to a product');
exception when others then raise exception '[section 1] %', sqlerrm;
end $$;

-- ---------- 2. rows stay tidy ----------
do $$
begin
  perform pg_temp.expect_err($q$insert into public.product_colours values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002')$q$, 'product_colours_pkey');
  perform pg_temp.expect_err($q$insert into public.product_colours values ('a0000000-0000-4000-8000-0000000000ff', 'f0000000-0000-4000-8000-000000000002')$q$, 'foreign key');
  delete from public.colours where id = 'f0000000-0000-4000-8000-000000000002';
  perform pg_temp.check((select count(*) from public.product_colours) = 1, 'deleting a colour removes it from the products that offered it');
  delete from public.products where id = 'a0000000-0000-4000-8000-000000000001';
  perform pg_temp.check((select count(*) from public.product_colours) = 0, 'deleting a product removes its colour list');
exception when others then raise exception '[section 2] %', sqlerrm;
end $$;

rollback;
select 'ALL PASSED' as result;
