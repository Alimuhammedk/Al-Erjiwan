-- Tests for 0008_articles.sql. Paste into Supabase > SQL Editor > New query > Run, AFTER running 0008_articles.sql.
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

insert into public.articles (id, title, excerpt, body, cover_url, is_published) values
  ('a0000000-0000-4000-8000-000000000001', 'كيف تختار لون غرفتك', 'نصائح قصيرة', 'نص المقال', 'https://x.supabase.co/a.webp', true),
  ('a0000000-0000-4000-8000-000000000002', 'مقال غير منشور', null, '', 'https://x.supabase.co/b.webp', false);

-- ---------- 1. who can read what ----------
do $$
begin
  set local role anon;
  perform pg_temp.check((select count(*) from public.articles) = 1, 'a visitor sees only the published article');
  perform pg_temp.check((select title from public.articles) = 'كيف تختار لون غرفتك', 'and it is the right one');
  reset role;
  perform pg_temp.expect_err($q$insert into public.articles (title, cover_url) values ('اختراق', 'x')$q$, 'permission denied', 'anon');
  perform pg_temp.expect_err($q$update public.articles set title = 'تعديل'$q$, 'permission denied', 'anon');
  perform pg_temp.expect_err($q$delete from public.articles$q$, 'permission denied', 'anon');
  perform pg_temp.expect_err($q$insert into public.articles (title, cover_url) values ('غريب', 'x')$q$, 'row-level security', 'authenticated', '{"email":"someone@else.com"}');

  perform set_config('request.jwt.claims', '{"email":"mhmdkbyhanly@gmail.com"}', true);
  set local role authenticated;
  perform pg_temp.check((select count(*) from public.articles) = 2, 'the admin sees every article, published or not');
  insert into public.articles (title, cover_url) values ('مقال جديد', 'https://x.supabase.co/c.webp');
  update public.articles set is_published = true where id = 'a0000000-0000-4000-8000-000000000002';
  reset role;
  perform pg_temp.check((select count(*) from public.articles) = 3, 'the admin can add');
exception when others then raise exception '[section 1] %', sqlerrm;
end $$;

-- ---------- 2. the table keeps articles sane ----------
do $$
declare v_before timestamptz;
begin
  perform pg_temp.expect_err($q$insert into public.articles (title, cover_url) values ('ع', 'x')$q$, 'title');
  perform pg_temp.expect_err($q$insert into public.articles (title, cover_url) values ('   ', 'x')$q$, 'title');
  perform pg_temp.expect_err(format('insert into public.articles (title, cover_url) values (%L, %L)', repeat('ا', 151), 'x'), 'title');
  perform pg_temp.expect_err($q$insert into public.articles (title, cover_url) values ('عنوان صحيح', '')$q$, 'cover_url');
  perform pg_temp.expect_err(format('insert into public.articles (title, cover_url, excerpt) values (%L, %L, %L)', 'عنوان صحيح', 'x', repeat('ا', 301)), 'excerpt');
  perform pg_temp.expect_err(format('insert into public.articles (title, cover_url, body) values (%L, %L, %L)', 'عنوان صحيح', 'x', repeat('ا', 20001)), 'body');
  perform pg_temp.expect_err($q$insert into public.articles (title, cover_url, images) values ('عنوان صحيح', 'x', array['1','2','3','4','5','6','7'])$q$, 'images');
  insert into public.articles (title, cover_url, images) values ('بست صور', 'x', array['1','2','3','4','5','6']);

  select updated_at into v_before from public.articles where id = 'a0000000-0000-4000-8000-000000000001';
  perform pg_sleep(0.01);
  update public.articles set title = 'عنوان معدّل' where id = 'a0000000-0000-4000-8000-000000000001';
  perform pg_temp.check((select updated_at from public.articles where id = 'a0000000-0000-4000-8000-000000000001') > v_before, 'editing an article updates its edited time');
exception when others then raise exception '[section 2] %', sqlerrm;
end $$;

rollback;
select 'ALL PASSED' as result;
