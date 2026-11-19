-- Tests for 0009_languages_and_pages.sql. Paste into Supabase > SQL Editor > New query > Run, AFTER running 0009_languages_and_pages.sql.
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

-- ---------- 1. the four pages and who can use them ----------
do $$
begin
  perform pg_temp.check((select count(*) from public.site_pages) = 4, 'the four starter pages exist');
  perform pg_temp.check((select count(*) from public.site_pages where title_ar <> '' and title_en <> '' and body_ar <> '' and body_en <> '') = 4, 'each has Arabic and English wording');
  perform pg_temp.check((select map_url from public.site_pages where slug = 'about') is null, 'the map link starts empty');

  set local role anon;
  perform pg_temp.check((select count(*) from public.site_pages) = 4, 'a visitor can read the pages');
  reset role;
  perform pg_temp.expect_err($q$update public.site_pages set title_ar = 'اختراق'$q$, 'permission denied', 'anon');
  perform pg_temp.expect_err($q$insert into public.site_pages (slug) values ('about')$q$, 'permission denied', 'anon');
  perform pg_temp.expect_err($q$delete from public.site_pages$q$, 'permission denied', 'anon');

  perform set_config('request.jwt.claims', '{"email":"someone@else.com"}', true);
  set local role authenticated;
  update public.site_pages set title_ar = 'تعديل غريب';
  perform pg_temp.check((select count(*) from public.site_pages where title_ar = 'تعديل غريب') = 0, 'a signed-in non-admin changes nothing');
  reset role;

  perform set_config('request.jwt.claims', '{"email":"mhmdkbyhanly@gmail.com"}', true);
  set local role authenticated;
  update public.site_pages set title_ar = 'نبذة عنا', map_url = 'https://www.google.com/maps?q=32.2,44.3' where slug = 'about';
  reset role;
  perform pg_temp.check((select title_ar from public.site_pages where slug = 'about') = 'نبذة عنا', 'the admin can edit a page');
exception when others then raise exception '[section 1] %', sqlerrm;
end $$;

-- ---------- 2. the table keeps pages sane ----------
do $$
declare v_before timestamptz;
begin
  perform pg_temp.expect_err($q$insert into public.site_pages (slug) values ('contact')$q$, 'slug');
  perform pg_temp.expect_err($q$insert into public.site_pages (slug) values ('about')$q$, 'site_pages_pkey');
  perform pg_temp.expect_err(format('update public.site_pages set title_en = %L where slug = %L', repeat('a', 151), 'faq'), 'title_en');
  perform pg_temp.expect_err(format('update public.site_pages set body_ar = %L where slug = %L', repeat('ا', 20001), 'faq'), 'body_ar');
  perform pg_temp.expect_err(format('update public.site_pages set map_url = %L where slug = %L', repeat('a', 1001), 'about'), 'map_url');
  select updated_at into v_before from public.site_pages where slug = 'faq';
  perform pg_sleep(0.01);
  update public.site_pages set title_en = 'FAQ' where slug = 'faq';
  perform pg_temp.check((select updated_at from public.site_pages where slug = 'faq') > v_before, 'editing a page updates its edited time');
exception when others then raise exception '[section 2] %', sqlerrm;
end $$;

-- ---------- 3. the English boxes ----------
do $$
begin
  insert into public.articles (id, title, cover_url, title_en, excerpt_en, body_en) values ('a0000000-0000-4000-8000-000000000001', 'مقال', 'https://x/a.webp', 'Article', 'Short', 'Text');
  perform pg_temp.check((select title_en from public.articles) = 'Article', 'an article keeps its English text');
  perform pg_temp.expect_err(format('update public.articles set title_en = %L', repeat('a', 151)), 'title_en');
  perform pg_temp.expect_err(format('update public.articles set excerpt_en = %L', repeat('a', 301)), 'excerpt_en');
  perform pg_temp.expect_err(format('update public.articles set body_en = %L', repeat('a', 20001)), 'body_en');
  insert into public.banners (image_url, title_en) values ('https://x/b.webp', 'Winter offers');
  perform pg_temp.check((select title_en from public.banners where image_url = 'https://x/b.webp') = 'Winter offers', 'a banner keeps its English title');
  perform pg_temp.expect_err(format('update public.banners set title_en = %L', repeat('a', 201)), 'title_en');
  insert into public.products (id, name_ar, base_price, stock, description_en) values ('b0000000-0000-4000-8000-000000000001', 'منتج', 1000, 1, 'English description');
  perform pg_temp.check((select description_en from public.products where id = 'b0000000-0000-4000-8000-000000000001') = 'English description', 'a product keeps its English description');
  perform pg_temp.expect_err(format('update public.products set description_en = %L', repeat('a', 5001)), 'description_en');
exception when others then raise exception '[section 3] %', sqlerrm;
end $$;

rollback;
select 'ALL PASSED' as result;
