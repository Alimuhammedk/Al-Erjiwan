-- Removes delivery companies for good: the two company tables and the company / cost / delivery-notes columns on orders.
-- THIS DELETES DATA: company names, their prices, and each order's company, company cost and delivery notes are gone afterwards.
-- Delivery fees per governorate (delivery_zones) and the customer's own notes are not touched.
-- Run it AFTER the new site version is live (the old site still reads these columns). Paste it into Supabase > SQL Editor > Run (once).
-- Then run supabase/tests/0010_remove_delivery_companies_test.sql.

-- Tracking no longer returns a company name.
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
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(product_name, '—'), 'size', size_label, 'quantity', quantity))
                         from public.order_items where order_id = v_o.id), '[]'::jsonb));
end $$;

alter table public.orders
  drop column delivery_company_id,
  drop column delivery_company,
  drop column delivery_cost,
  drop column delivery_notes;

drop table public.delivery_company_prices;
drop table public.delivery_companies;

-- Saved customer messages that still mention \{company\}: take that line out (a message left empty goes back to the built-in text).
update public.settings
set value = trim(both E'\n' from regexp_replace(value, E'(^|\\n)[^\\n]*\\{company\\}[^\\n]*', '', 'g'))
where key in ('message_confirm', 'message_update') and value like '%\{company\}%';
delete from public.settings where key in ('message_confirm', 'message_update') and trim(value) = '';
