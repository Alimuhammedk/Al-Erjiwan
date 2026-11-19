-- Tests for 0006_colours.sql. Paste into Supabase > SQL Editor > New query > Run, AFTER running 0006_colours.sql.
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

create function pg_temp.as_admin() returns void language sql as $$
  select set_config('request.jwt.claims', '{"email":"mhmdkbyhanly@gmail.com"}', true)
$$;

delete from public.colours;
insert into public.colours (name_ar, system, code, hex, family) values
  ('أبيض', 'JW', 'W1', '#ffffff', 'الأبيض'),
  ('أسود', 'JW', 'B1', '#000000', 'الأسود'),
  ('أحمر', 'JW', 'R1', '#ff0000', 'الأحمر'),
  ('أحمر داكن', 'JW', 'R2', '#cc0000', 'الأحمر'),
  ('أزرق', 'JW', 'U1', '#0000ff', 'الأزرق');

-- ---------- 1. closest shades ----------
do $$
declare v text[];
begin
  select array_agg(code order by ord) into v from (select code, row_number() over () as ord from public.closest_colours('#ff0000', 5)) s;
  perform pg_temp.check(v[1] = 'R1' and v[2] = 'R2', 'the exact colour is first, then the nearest: ' || array_to_string(v, ','));
  perform pg_temp.check(v[5] = 'W1', 'the farthest (white) comes last');
  perform pg_temp.check((select code from public.closest_colours('FF0000', 1)) = 'R1', 'a hex without # and in capitals works');
  perform pg_temp.check((select code from public.closest_colours('#fefefe', 1)) = 'W1', 'near white finds white');
  perform pg_temp.check((select code from public.closest_colours('#050505', 1)) = 'B1', 'near black finds black');
  perform pg_temp.check((select count(*) from public.closest_colours('#ff0000', 2)) = 2, 'the limit is respected');
  perform pg_temp.check((select count(*) from public.closest_colours('#ff0000', 0)) = 1, 'a limit of 0 becomes 1');
  perform pg_temp.check((select count(*) from public.closest_colours('#ff0000', 1000)) = 5, 'a huge limit is capped (and never more than there are)');
  perform pg_temp.check((select count(*) from public.closest_colours('#ff0000', null)) = 5, 'no limit uses the default');
  perform pg_temp.check((select count(*) from public.closest_colours('zzz')) = 0, 'a bad hex finds nothing');
  perform pg_temp.check((select count(*) from public.closest_colours('#12')) = 0, 'a short hex finds nothing');
  perform pg_temp.check((select count(*) from public.closest_colours(null)) = 0, 'null finds nothing');
  perform pg_temp.check((select count(*) from public.closest_colours('#gg0000')) = 0, 'non-hex letters find nothing');
exception when others then raise exception '[section 1] %', sqlerrm;
end $$;

-- ---------- 2. unique codes ----------
do $$
begin
  perform pg_temp.expect_err($q$insert into public.colours (name_ar, system, code, hex) values ('نسخة', 'JW', 'W1', '#eeeeee')$q$, 'colours_system_code_key');
  insert into public.colours (name_ar, system, code, hex) values ('أبيض آخر', 'OTHER', 'W1', '#eeeeee');
  insert into public.colours (name_ar, system, code, hex) values ('بلا نظام 1', null, 'X1', '#111111');
  perform pg_temp.expect_err($q$insert into public.colours (name_ar, system, code, hex) values ('بلا نظام 2', null, 'X1', '#222222')$q$, 'colours_system_code_key');
  insert into public.colours (name_ar, hex) values ('بلا رمز 1', '#333333'), ('بلا رمز 2', '#444444');
  perform pg_temp.expect_err($q$insert into public.colours (name_ar, code, hex) values ('سيء', 'Z9', 'red')$q$, 'hex');
exception when others then raise exception '[section 2] %', sqlerrm;
end $$;

-- ---------- 3. who may do what ----------
do $$
begin
  perform pg_temp.check((select count(*) from public.colours) > 0, 'there are colours');
  set local role anon;
  perform pg_temp.check((select count(*) from public.colours) > 0, 'a visitor can read colours');
  perform pg_temp.check((select count(*) from public.closest_colours('#ff0000', 3)) = 3, 'a visitor can search by closeness');
  reset role;
  perform pg_temp.expect_err($q$insert into public.colours (name_ar, hex) values ('اختراق', '#123456')$q$, 'permission denied', 'anon');
  perform pg_temp.expect_err($q$select public.import_colours('[{"name_ar":"اختراق","hex":"#123456"}]'::jsonb)$q$, 'permission denied', 'anon');
  perform pg_temp.expect_err($q$select public.import_colours('[{"name_ar":"اختراق","hex":"#123456"}]'::jsonb)$q$, 'FORBIDDEN', 'authenticated', '{"email":"someone@else.com"}');
exception when others then raise exception '[section 3] %', sqlerrm;
end $$;

-- ---------- 4. bulk import ----------
do $$
declare r jsonb; v_before int; v_hex text;
begin
  perform pg_temp.as_admin();
  r := public.import_colours('[
    {"system":"JW","code":"N1","name_ar":"جديد 1","name_en":"New 1","hex":"#AABBCC","family":"الرمادي"},
    {"system":"JW","code":"N2","name_ar":"جديد 2","hex":"#112233"},
    {"system":"JW","code":"W1","name_ar":"أبيض معدّل","hex":"#fafafa","family":"الأبيض"}
  ]'::jsonb);
  perform pg_temp.check(r = '{"added": 2, "updated": 1}'::jsonb, 'two added and one updated: ' || r::text);
  perform pg_temp.check((select name_ar from public.colours where system = 'JW' and code = 'W1') = 'أبيض معدّل', 'the existing shade was updated, not duplicated');
  perform pg_temp.check((select count(*) from public.colours where system = 'JW' and code = 'W1') = 1, 'still one W1');
  perform pg_temp.check((select hex from public.colours where code = 'N1') = '#aabbcc', 'hex is stored in lower case');
  perform pg_temp.check((select name_en from public.colours where code = 'N2') is null, 'a missing English name stays empty');

  -- again with the same data: nothing new
  select count(*) into v_before from public.colours;
  r := public.import_colours('[{"system":"JW","code":"N1","name_ar":"جديد 1","name_en":"New 1","hex":"#aabbcc","family":"الرمادي"}]'::jsonb);
  perform pg_temp.check(r = '{"added": 0, "updated": 1}'::jsonb and (select count(*) from public.colours) = v_before, 'importing the same row again adds nothing');

  -- rows without a code are always added
  r := public.import_colours('[{"name_ar":"بلا رمز","hex":"#010101"},{"name_ar":"بلا رمز","hex":"#010101"}]'::jsonb);
  perform pg_temp.check(r = '{"added": 2, "updated": 0}'::jsonb, 'rows without a code are added each time');

  -- all or nothing: the bad second row undoes the good first one
  select count(*) into v_before from public.colours;
  perform pg_temp.expect_err($q$select public.import_colours('[{"name_ar":"صحيح","code":"OK1","hex":"#123456"},{"name_ar":"س","hex":"#123456"}]'::jsonb)$q$, 'INVALID_ROW:2');
  perform pg_temp.check((select count(*) from public.colours) = v_before, 'a bad row leaves nothing half-imported');
  perform pg_temp.expect_err($q$select public.import_colours('[{"name_ar":"صحيح","hex":"red"}]'::jsonb)$q$, 'INVALID_ROW:1');
  perform pg_temp.expect_err($q$select public.import_colours('[]'::jsonb)$q$, 'INVALID_INPUT');
  perform pg_temp.expect_err($q$select public.import_colours('{}'::jsonb)$q$, 'INVALID_INPUT');
  perform pg_temp.expect_err($q$select public.import_colours(null)$q$, 'INVALID_INPUT');
  perform pg_temp.expect_err(format('select public.import_colours(%L::jsonb)', (select jsonb_agg(jsonb_build_object('name_ar', 'لون', 'hex', '#123456')) from generate_series(1, 1001))), 'INVALID_INPUT');
exception when others then raise exception '[section 4] %', sqlerrm;
end $$;

rollback;
select 'ALL PASSED' as result;
