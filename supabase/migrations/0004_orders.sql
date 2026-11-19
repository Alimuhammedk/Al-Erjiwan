-- Orders, automatic stock and tracking.
-- Paste this whole file into Supabase > SQL Editor > New query > Run (once). Then run supabase/tests/0004_orders_test.sql.
-- All money and stock rules live here, so the website can never choose a price, skip a stock check or change an order.

-- ============ New columns ============
alter table public.orders
  add column landmark text,
  add column delivery_company text,
  add column tracking_note text,
  add column internal_note text,
  add column stock_restored boolean not null default false,
  add column updated_at timestamptz not null default now();

alter table public.orders drop constraint orders_status_check;
alter table public.orders
  add constraint orders_status_check check (status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'));

-- What was bought, as it was at the time (so history survives later product edits and deletes).
alter table public.order_items
  add column product_name text,
  add column size_label text,
  add column colour_name text,
  add column colour_code text;

alter table public.delivery_zones add column min_order numeric(12,0) not null default 0 check (min_order >= 0);

create index on public.orders (phone);
create index on public.orders (status, created_at desc);

-- ============ Stock history ============
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text,
  size_label text,
  delta int not null,
  reason text not null check (reason in ('order', 'cancel', 'return', 'manual', 'shop_sale')),
  order_id uuid references public.orders (id) on delete set null,
  note text,
  by_email text
);
create index on public.stock_movements (product_id, created_at desc);
alter table public.stock_movements enable row level security;
create policy "admin all" on public.stock_movements for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.stock_movements to authenticated;

insert into public.settings (key, value) values ('low_stock_threshold', '5') on conflict (key) do nothing;

-- ============ A product's stock follows its sizes ============
create function public.sync_product_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products
     set stock = coalesce((select sum(stock) from public.product_variants where product_id = pid), 0)
   where id = pid and exists (select 1 from public.product_variants where product_id = pid);
  return null;
end $$;

create trigger product_variants_sync_stock
after insert or update of stock or delete on public.product_variants
for each row execute function public.sync_product_stock();

-- ============ Phone numbers: any common way of typing an Iraqi mobile becomes 07XXXXXXXXX ============
create function public.normalize_phone(p text) returns text
language plpgsql immutable as $$
declare d text;
begin
  d := translate(coalesce(p, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  d := regexp_replace(d, '\D', '', 'g');
  if d like '00964%' then d := '0' || substr(d, 6);
  elsif d like '964%' then d := '0' || substr(d, 4);
  elsif length(d) = 10 and d like '7%' then d := '0' || d;
  end if;
  if d ~ '^07[0-9]{9}$' then return d; end if;
  return null;
end $$;

-- ============ Placing an order (anyone may call this; it checks everything itself) ============
-- p_items: [{ "product_id", "variant_id", "colour_id", "colour_note", "quantity" }]. Prices are never taken from the caller.
create function public.place_order(
  p_name text, p_phone text, p_governorate text, p_city text, p_address text,
  p_landmark text, p_notes text, p_items jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_phone text := public.normalize_phone(p_phone);
  v_zone public.delivery_zones;
  v_order uuid := gen_random_uuid();
  v_code text;
  v_item jsonb;
  v_qty int;
  v_product public.products;
  v_variant public.product_variants;
  v_colour public.colours;
  v_has_sizes boolean;
  v_unit numeric;
  v_subtotal numeric := 0;
  v_note text;
  v_rows int;
begin
  if coalesce(length(trim(p_name)), 0) < 2 or length(p_name) > 100
     or v_phone is null
     or coalesce(length(trim(p_address)), 0) < 5 or length(p_address) > 300
     or length(coalesce(p_city, '')) > 100 or length(coalesce(p_landmark, '')) > 150 or length(coalesce(p_notes, '')) > 500 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'INVALID_INPUT'; end if;

  select * into v_zone from public.delivery_zones where governorate_ar = trim(p_governorate) and is_active;
  if not found then raise exception 'ZONE_INVALID'; end if;

  insert into public.orders (id, customer_name, phone, governorate, city, address, landmark, notes, subtotal, delivery_fee, total)
  values (v_order, trim(p_name), v_phone, v_zone.governorate_ar, nullif(trim(p_city), ''), trim(p_address),
          nullif(trim(p_landmark), ''), nullif(trim(p_notes), ''), 0, v_zone.fee, 0)
  returning code into v_code;

  -- Lines are handled in a fixed order so two orders never wait on each other forever.
  for v_item in
    select e from jsonb_array_elements(p_items) with ordinality as t(e, n)
    order by e ->> 'product_id', e ->> 'variant_id', n
  loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'INVALID_INPUT'; end if;
    if coalesce(v_item ->> 'quantity', '') !~ '^[0-9]{1,3}$' then raise exception 'INVALID_INPUT'; end if;
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty < 1 or v_qty > 99 then raise exception 'INVALID_INPUT'; end if;
    if coalesce(v_item ->> 'product_id', '') !~ c_uuid then raise exception 'INVALID_INPUT'; end if;
    if coalesce(v_item ->> 'variant_id', '') <> '' and (v_item ->> 'variant_id') !~ c_uuid then raise exception 'INVALID_INPUT'; end if;
    if coalesce(v_item ->> 'colour_id', '') <> '' and (v_item ->> 'colour_id') !~ c_uuid then raise exception 'INVALID_INPUT'; end if;

    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid and is_active;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;

    select exists (select 1 from public.product_variants where product_id = v_product.id) into v_has_sizes;
    v_variant := null;
    if coalesce(v_item ->> 'variant_id', '') <> '' then
      select * into v_variant from public.product_variants
       where id = (v_item ->> 'variant_id')::uuid and product_id = v_product.id;
      if not found then raise exception 'INVALID_INPUT'; end if;
    elsif v_has_sizes then
      raise exception 'SIZE_REQUIRED:%', v_product.name_ar;
    end if;

    -- price: the size's own price, otherwise the sale price when it is lower, otherwise the normal price
    if v_variant.id is not null then
      v_unit := v_variant.price;
    elsif v_product.sale_price is not null and v_product.sale_price < v_product.base_price then
      v_unit := v_product.sale_price;
    else
      v_unit := v_product.base_price;
    end if;

    -- colour: ready-made paint takes the colour of its size; mixed paint needs a chosen or typed colour
    v_colour := null;
    v_note := null;
    if v_product.is_tintable then
      v_note := nullif(left(trim(coalesce(v_item ->> 'colour_note', '')), 100), '');
      if coalesce(v_item ->> 'colour_id', '') <> '' then
        select * into v_colour from public.colours where id = (v_item ->> 'colour_id')::uuid;
        if not found then raise exception 'INVALID_INPUT'; end if;
      end if;
      if v_colour.id is null and v_note is null then raise exception 'COLOUR_REQUIRED:%', v_product.name_ar; end if;
    elsif v_variant.colour_id is not null then
      select * into v_colour from public.colours where id = v_variant.colour_id;
    end if;

    -- stock: check and deduct in one statement, so the last unit can only be sold once
    if v_variant.id is not null then
      update public.product_variants set stock = stock - v_qty where id = v_variant.id and stock >= v_qty;
    else
      update public.products set stock = stock - v_qty where id = v_product.id and stock >= v_qty;
    end if;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then raise exception 'OUT_OF_STOCK:%', v_product.name_ar; end if;

    insert into public.order_items (order_id, product_id, variant_id, colour_id, colour_note, quantity, unit_price,
                                    product_name, size_label, colour_name, colour_code)
    values (v_order, v_product.id, v_variant.id, v_colour.id, v_note, v_qty, v_unit,
            v_product.name_ar, v_variant.size_label, v_colour.name_ar, v_colour.code);

    insert into public.stock_movements (product_id, variant_id, product_name, size_label, delta, reason, order_id)
    values (v_product.id, v_variant.id, v_product.name_ar, v_variant.size_label, -v_qty, 'order', v_order);

    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  if v_subtotal < v_zone.min_order then raise exception 'MIN_ORDER'; end if;

  update public.orders set subtotal = v_subtotal, total = v_subtotal + v_zone.fee where id = v_order;
  return v_code;
end $$;

-- ============ Changing an order's status (admin only); cancelling or returning gives stock back once ============
create function public.set_order_status(p_order uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_allowed text[];
  v_item record;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  v_allowed := case v_order.status
    when 'new' then array['confirmed', 'shipped', 'delivered', 'cancelled']
    when 'confirmed' then array['shipped', 'delivered', 'cancelled']
    when 'shipped' then array['delivered', 'returned']
    when 'delivered' then array['returned']
    else array[]::text[]
  end;
  if p_status is null or not (p_status = any (v_allowed)) then raise exception 'INVALID_TRANSITION'; end if;

  if p_status in ('cancelled', 'returned') and not v_order.stock_restored then
    for v_item in
      select oi.*, coalesce(p.is_tintable, false) as tinted
        from public.order_items oi
        left join public.products p on p.id = oi.product_id
       where oi.order_id = p_order
    loop
      -- cancelled: everything goes back. returned: mixed (tinted) paint cannot be resold, the rest goes back.
      if p_status = 'cancelled' or not v_item.tinted then
        if v_item.variant_id is not null then
          update public.product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
        elsif v_item.product_id is not null
              and not exists (select 1 from public.product_variants where product_id = v_item.product_id) then
          update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
        else
          continue;
        end if;
        insert into public.stock_movements (product_id, variant_id, product_name, size_label, delta, reason, order_id, by_email)
        values (v_item.product_id, v_item.variant_id, v_item.product_name, v_item.size_label, v_item.quantity,
                case p_status when 'cancelled' then 'cancel' else 'return' end, p_order,
                lower(coalesce(auth.jwt() ->> 'email', '')));
      end if;
    end loop;
  end if;

  update public.orders
     set status = p_status,
         updated_at = now(),
         stock_restored = stock_restored or p_status in ('cancelled', 'returned')
   where id = p_order;
end $$;

-- ============ Manual stock changes: new deliveries and sales made in the shop (admin only) ============
create function public.adjust_stock(p_product uuid, p_variant uuid, p_delta int, p_reason text, p_note text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_new int;
  v_name text;
  v_label text;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_reason is null or p_reason not in ('manual', 'shop_sale') or p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    raise exception 'INVALID_INPUT';
  end if;
  select name_ar into v_name from public.products where id = p_product;
  if not found then raise exception 'INVALID_INPUT'; end if;

  if p_variant is not null then
    update public.product_variants set stock = stock + p_delta
     where id = p_variant and product_id = p_product and stock + p_delta >= 0
    returning stock, size_label into v_new, v_label;
    if not found then
      if exists (select 1 from public.product_variants where id = p_variant and product_id = p_product) then
        raise exception 'NEGATIVE_STOCK';
      end if;
      raise exception 'INVALID_INPUT';
    end if;
  else
    if exists (select 1 from public.product_variants where product_id = p_product) then raise exception 'INVALID_INPUT'; end if;
    update public.products set stock = stock + p_delta where id = p_product and stock + p_delta >= 0 returning stock into v_new;
    if not found then raise exception 'NEGATIVE_STOCK'; end if;
  end if;

  insert into public.stock_movements (product_id, variant_id, product_name, size_label, delta, reason, note, by_email)
  values (p_product, p_variant, v_name, v_label, p_delta, p_reason, nullif(trim(p_note), ''), lower(coalesce(auth.jwt() ->> 'email', '')));
  return v_new;
end $$;

-- ============ What a customer may see ============
create function public.track_order(p_code text, p_phone text) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_o public.orders;
begin
  if v_phone is null then return null; end if;
  select * into v_o from public.orders where code = upper(trim(p_code)) and phone = v_phone;
  if not found then return null; end if;
  return jsonb_build_object(
    'status', v_o.status, 'created_at', v_o.created_at, 'updated_at', v_o.updated_at, 'total', v_o.total,
    'delivery_company', v_o.delivery_company, 'tracking_note', v_o.tracking_note,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(product_name, '—'), 'size', size_label, 'quantity', quantity))
                         from public.order_items where order_id = v_o.id), '[]'::jsonb));
end $$;

-- For the confirmation page: only the code is needed, and nothing personal is returned.
create function public.order_summary(p_code text) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare v_o public.orders;
begin
  select * into v_o from public.orders where code = upper(trim(p_code));
  if not found then return null; end if;
  return jsonb_build_object(
    'status', v_o.status, 'created_at', v_o.created_at, 'total', v_o.total,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(product_name, '—'), 'size', size_label, 'quantity', quantity))
                         from public.order_items where order_id = v_o.id), '[]'::jsonb));
end $$;

-- ============ Dashboard numbers (admin only) ============
create function public.dashboard_stats() returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_threshold int := coalesce((select case when value ~ '^[0-9]+$' then value::int end from public.settings where key = 'low_stock_threshold'), 5);
  v_day timestamptz := date_trunc('day', now() at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad';
  v_month timestamptz := date_trunc('month', now() at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad';
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'new_orders', (select count(*) from public.orders where status = 'new'),
    'orders_today', (select count(*) from public.orders where created_at >= v_day),
    'sales_today', (select coalesce(sum(total), 0) from public.orders where status not in ('cancelled', 'returned') and created_at >= v_day),
    'sales_month', (select coalesce(sum(total), 0) from public.orders where status not in ('cancelled', 'returned') and created_at >= v_month),
    'out_of_stock', (
      select count(*) from (
        select p.id from public.products p
         where p.is_active and p.stock = 0 and not exists (select 1 from public.product_variants v where v.product_id = p.id)
        union all
        select v.id from public.product_variants v join public.products p on p.id = v.product_id where p.is_active and v.stock = 0
      ) z),
    'low_stock', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select x from (
          select jsonb_build_object('name', p.name_ar, 'size', null, 'stock', p.stock) as x
            from public.products p
           where p.is_active and p.stock <= v_threshold and not exists (select 1 from public.product_variants v where v.product_id = p.id)
          union all
          select jsonb_build_object('name', p.name_ar, 'size', v.size_label, 'stock', v.stock)
            from public.product_variants v join public.products p on p.id = v.product_id
           where p.is_active and v.stock <= v_threshold
        ) u
        order by (x ->> 'stock')::int, x ->> 'name'
        limit 20
      ) s),
    'best_sellers', (
      select coalesce(jsonb_agg(jsonb_build_object('name', n, 'quantity', q) order by q desc), '[]'::jsonb) from (
        select coalesce(oi.product_name, '—') as n, sum(oi.quantity)::int as q
          from public.order_items oi join public.orders o on o.id = oi.order_id
         where o.created_at >= now() - interval '30 days' and o.status not in ('cancelled', 'returned')
         group by 1 order by q desc limit 5
      ) t)
  );
end $$;

-- ============ Who may call what ============
revoke all on function public.place_order(text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, text, text, text, text, jsonb) to anon, authenticated;
revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
revoke all on function public.order_summary(text) from public;
grant execute on function public.order_summary(text) to anon, authenticated;

revoke all on function public.set_order_status(uuid, text) from public;
grant execute on function public.set_order_status(uuid, text) to authenticated;
revoke all on function public.adjust_stock(uuid, uuid, int, text, text) from public;
grant execute on function public.adjust_stock(uuid, uuid, int, text, text) to authenticated;
revoke all on function public.dashboard_stats() from public;
grant execute on function public.dashboard_stats() to authenticated;
