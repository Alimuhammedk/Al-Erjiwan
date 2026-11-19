-- Colour catalogue: a system (brand) per shade, unique codes, "closest shades" search and a safe bulk import.
-- Paste this whole file into Supabase > SQL Editor > New query > Run (once). Then run supabase/tests/0006_colours_test.sql.

alter table public.colours add column system text;

-- A shade is identified by its system and code (the same code may exist in another system; blank codes may repeat).
create unique index colours_system_code_key on public.colours ((coalesce(system, '')), code) where code is not null;
create index colours_name_idx on public.colours (lower(name_ar));
create index colours_code_idx on public.colours (lower(code));
create index colours_family_idx on public.colours (family);

-- The shades nearest to a colour, by weighted RGB distance ("redmean"). Anyone may call it; it only reads.
create function public.closest_colours(p_hex text, p_limit int default 12) returns setof public.colours
language sql stable set search_path = public as $$
  with target as (
    select r, g, b
      from (select case when h ~ '^[0-9a-fA-F]{6}$' then ('x' || substr(h, 1, 2))::bit(8)::int end as r,
                   case when h ~ '^[0-9a-fA-F]{6}$' then ('x' || substr(h, 3, 2))::bit(8)::int end as g,
                   case when h ~ '^[0-9a-fA-F]{6}$' then ('x' || substr(h, 5, 2))::bit(8)::int end as b
              from (select ltrim(coalesce(p_hex, ''), '#') as h) s) v
     where r is not null
  )
  select c.*
    from public.colours c, target t,
         lateral (select ('x' || substr(c.hex, 2, 2))::bit(8)::int as r, ('x' || substr(c.hex, 4, 2))::bit(8)::int as g, ('x' || substr(c.hex, 6, 2))::bit(8)::int as b) k
   order by (2 + ((t.r + k.r) / 2.0) / 256) * power(t.r - k.r, 2)
          + 4 * power(t.g - k.g, 2)
          + (2 + (255 - ((t.r + k.r) / 2.0)) / 256) * power(t.b - k.b, 2),
            c.name_ar
   limit greatest(1, least(coalesce(p_limit, 12), 60))
$$;
revoke all on function public.closest_colours(text, int) from public;
grant execute on function public.closest_colours(text, int) to anon, authenticated;

-- Bulk import for the admin: adds new shades and updates existing ones (same system and code), all or nothing.
-- p_rows: [{ system, code, name_ar, name_en, hex, family }]
create function public.import_colours(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_n int := 0;
  v_added int := 0;
  v_updated int := 0;
  v_system text;
  v_code text;
  v_name text;
  v_hex text;
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 1000 then
    raise exception 'INVALID_INPUT';
  end if;

  for v_row in select e from jsonb_array_elements(p_rows) e loop
    v_n := v_n + 1;
    v_system := nullif(trim(v_row ->> 'system'), '');
    v_code := nullif(trim(v_row ->> 'code'), '');
    v_name := trim(coalesce(v_row ->> 'name_ar', ''));
    v_hex := lower(coalesce(v_row ->> 'hex', ''));
    if length(v_name) < 2 or length(v_name) > 100 or v_hex !~ '^#[0-9a-f]{6}$'
       or length(coalesce(v_system, '')) > 50 or length(coalesce(v_code, '')) > 40
       or length(coalesce(v_row ->> 'name_en', '')) > 100 or length(coalesce(v_row ->> 'family', '')) > 40 then
      raise exception 'INVALID_ROW:%', v_n;
    end if;

    v_id := null;
    if v_code is not null then
      select id into v_id from public.colours where coalesce(system, '') = coalesce(v_system, '') and code = v_code;
    end if;
    if v_id is null then
      insert into public.colours (system, code, name_ar, name_en, hex, family)
      values (v_system, v_code, v_name, nullif(trim(v_row ->> 'name_en'), ''), v_hex, nullif(trim(v_row ->> 'family'), ''));
      v_added := v_added + 1;
    else
      update public.colours
         set name_ar = v_name, name_en = nullif(trim(v_row ->> 'name_en'), ''), hex = v_hex, family = nullif(trim(v_row ->> 'family'), '')
       where id = v_id;
      v_updated := v_updated + 1;
    end if;
  end loop;
  return jsonb_build_object('added', v_added, 'updated', v_updated);
end $$;
revoke all on function public.import_colours(jsonb) from public;
grant execute on function public.import_colours(jsonb) to authenticated;
