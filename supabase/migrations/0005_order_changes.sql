-- Round 2: free status changes, deleting orders, delivery companies, city + landmark, richer dashboard.
-- Paste this whole file into Supabase > SQL Editor > New query > Run (once). Then run supabase/tests/0005_order_changes_test.sql.

-- ============ Delivery companies (admin only) ============
create table public.delivery_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  whatsapp text not null check (whatsapp ~ '^07[0-9]{9}$'),
  notes text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.delivery_company_prices (
  company_id uuid not null references public.delivery_companies (id) on delete cascade,
  zone_id uuid not null references public.delivery_zones (id) on delete cascade,
  price numeric(12,0) not null check (price >= 0),
  primary key (company_id, zone_id)
);

alter table public.delivery_companies enable row level security;
alter table public.delivery_company_prices enable row level security;
create policy "admin all" on public.delivery_companies for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.delivery_company_prices for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.delivery_companies to authenticated;
grant select, insert, update, delete on public.delivery_company_prices to authenticated;

-- ============ Orders: company, its cost, one notes field ============
alter table public.orders
  add column delivery_company_id uuid references public.delivery_companies (id) on delete set null,
  add column delivery_cost numeric(12,0) check (delivery_cost >= 0);
alter table public.orders rename column internal_note to delivery_notes;

alter table public.stock_movements drop constraint stock_movements_reason_check;
alter table public.stock_movements
  add constraint stock_movements_reason_check check (reason in ('order', 'cancel', 'return', 'reopen', 'delete', 'manual', 'shop_sale'));

-- ============ Stock rule for statuses ============
-- How many units of a line are "given back" while the order is in a status.
create function public.restored_qty(p_status text, p_qty int, p_tinted boolean) returns int
language sql immutable as $$
  select case p_status
    when 'cancelled' then p_qty
    when 'returned' then case when p_tinted then 0 else p_qty end
    else 0
  end
$$;

-- Moves stock by the difference between two statuses. Internal: not callable from the website.
create function public.apply_order_stock(p_order uuid, p_from text, p_to text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_item record;
  v_d int;
  v_rows int;
begin
  for v_item in
    select oi.*, coalesce(p.is_tintable, false) as tinted
      from public.order_items oi
      left join public.products p on p.id = oi.product_id
     where oi.order_id = p_order
     order by oi.product_id, oi.variant_id
  loop
    v_d := public.restored_qty(p_to, v_item.quantity, v_item.tinted) - public.restored_qty(p_from, v_item.quantity, v_item.tinted);
    continue when v_d = 0;

    if v_item.variant_id is not null then
      update public.product_variants set stock = stock + v_d where id = v_item.variant_id and stock + v_d >= 0;
    elsif v_item.product_id is not null
          and not exists (select 1 from public.product_variants where product_id = v_item.product_id) then
      update public.products set stock = stock + v_d where id = v_item.product_id and stock + v_d >= 0;
    else
      continue;
    end if;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      if exists (select 1 from public.product_variants where id = v_item.variant_id)
         or exists (select 1 from public.products where id = v_item.product_id) then
        raise exception 'OUT_OF_STOCK:%', coalesce(v_item.product_name, '—');
      end if;
      continue; -- the product or size no longer exists
    end if;

    insert into public.stock_movements (product_id, variant_id, product_name, size_label, delta, reason, order_id, by_email)
    values (v_item.product_id, v_item.variant_id, v_item.product_name, v_item.size_label, v_d,
            coalesce(p_reason, case when v_d < 0 then 'reopen' when p_to = 'cancelled' then 'cancel' else 'return' end),
            p_order, lower(coalesce(auth.jwt() ->> 'email', '')));
  end loop;
end $$;
revoke all on function public.apply_order_stock(uuid, text, text, text) from public;

-- ============ Any status to any other (admin only) ============
create or replace function public.set_order_status(p_order uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare v_order public.orders;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status is null or p_status not in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned') then
    raise exception 'INVALID_INPUT';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.status = p_status then raise exception 'INVALID_TRANSITION'; end if;

  perform public.apply_order_stock(p_order, v_order.status, p_status, null);

  update public.orders
     set status = p_status, updated_at = now(), stock_restored = p_status in ('cancelled', 'returned')
   where id = p_order;
end $$;

-- ============ Deleting an order (admin only): stock returns unless it was delivered or already handled ============
create function public.delete_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_order public.orders;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.status in ('new', 'confirmed', 'shipped') then
    perform public.apply_order_stock(p_order, v_order.status, 'cancelled', 'delete');
  end if;
  delete from public.orders where id = p_order;
end $$;

revoke all on function public.delete_order(uuid) from public;
grant execute on function public.delete_order(uuid) to authenticated;

-- ============ Placing an order: city and landmark are required, the address is made from them ============
create or replace function public.place_order(
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
  v_address text;
begin
  if coalesce(length(trim(p_name)), 0) < 2 or length(p_name) > 100
     or v_phone is null
     or coalesce(length(trim(p_city)), 0) < 2 or length(p_city) > 100
     or coalesce(length(trim(p_landmark)), 0) < 2 or length(p_landmark) > 150
     or length(coalesce(p_address, '')) > 300 or length(coalesce(p_notes, '')) > 500 then
    raise exception 'INVALID_INPUT';
  end if;
  v_address := coalesce(nullif(trim(p_address), ''), trim(p_city) || ' - ' || trim(p_landmark));
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'INVALID_INPUT'; end if;

  select * into v_zone from public.delivery_zones where governorate_ar = trim(p_governorate) and is_active;
  if not found then raise exception 'ZONE_INVALID'; end if;

  insert into public.orders (id, customer_name, phone, governorate, city, address, landmark, notes, subtotal, delivery_fee, total)
  values (v_order, trim(p_name), v_phone, v_zone.governorate_ar, trim(p_city), v_address,
          trim(p_landmark), nullif(trim(p_notes), ''), 0, v_zone.fee, 0)
  returning code into v_code;

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

    if v_variant.id is not null then
      v_unit := v_variant.price;
    elsif v_product.sale_price is not null and v_product.sale_price < v_product.base_price then
      v_unit := v_product.sale_price;
    else
      v_unit := v_product.base_price;
    end if;

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

-- ============ What a customer sees when tracking: the company name, no internal notes ============
create or replace function public.track_order(p_code text, p_phone text) returns jsonb
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
    'delivery_company', v_o.delivery_company,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(product_name, '—'), 'size', size_label, 'quantity', quantity))
                         from public.order_items where order_id = v_o.id), '[]'::jsonb));
end $$;

-- ============ Dashboard: adds orders per status and a stock summary ============
create or replace function public.dashboard_stats() returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_threshold int := coalesce((select case when value ~ '^[0-9]+$' then value::int end from public.settings where key = 'low_stock_threshold'), 5);
  v_day timestamptz := date_trunc('day', now() at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad';
  v_month timestamptz := date_trunc('month', now() at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad';
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'new_orders', (select count(*) from public.orders where status = 'new'),
    'by_status', (select jsonb_object_agg(s, (select count(*) from public.orders o where o.status = s))
                    from unnest(array['new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']) s),
    'orders_today', (select count(*) from public.orders where created_at >= v_day),
    'sales_today', (select coalesce(sum(total), 0) from public.orders where status not in ('cancelled', 'returned') and created_at >= v_day),
    'sales_month', (select coalesce(sum(total), 0) from public.orders where status not in ('cancelled', 'returned') and created_at >= v_month),
    'stock_summary', (
      select jsonb_build_object(
               'available', count(*) filter (where stock > v_threshold),
               'low', count(*) filter (where stock > 0 and stock <= v_threshold),
               'out', count(*) filter (where stock = 0))
        from (
          select p.stock from public.products p
           where p.is_active and not exists (select 1 from public.product_variants v where v.product_id = p.id)
          union all
          select v.stock from public.product_variants v join public.products p on p.id = v.product_id where p.is_active
        ) z),
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
