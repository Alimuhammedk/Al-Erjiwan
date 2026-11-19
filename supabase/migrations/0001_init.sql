-- Al-Erjiwan store: tables, security rules, image bucket and starter data.
-- Paste this whole file into Supabase > SQL Editor > New query > Run. Safe to run once on an empty project.

-- ============ Admins ============
-- Anyone whose verified login email is in this table is an admin. To hand the store to someone else,
-- insert their email here (and delete the old one). No code change needed.
create table public.admins (email text primary key);
insert into public.admins (email) values ('mhmdkbyhanly@gmail.com');

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ============ Tables ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  image_url text,
  sort_order int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  brand text,
  base_price numeric(12,0) not null check (base_price >= 0),
  sale_price numeric(12,0) check (sale_price >= 0),
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_tintable boolean not null default false, -- true: customer picks any palette colour, stock counts the base paint
  created_at timestamptz not null default now()
);

create table public.colours (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  code text,
  hex text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  family text
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size_label text not null,                                  -- e.g. 1L, 4L, 18L
  price numeric(12,0) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  colour_id uuid references public.colours (id) on delete set null -- only for ready-made colours
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  governorate_ar text not null unique,
  fee numeric(12,0) not null default 0 check (fee >= 0),
  is_active boolean not null default true
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  link text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.settings (
  key text primary key,
  value text not null default ''
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  customer_name text not null,
  phone text not null,
  governorate text not null,
  city text,
  address text not null,
  notes text,
  subtotal numeric(12,0) not null check (subtotal >= 0),
  delivery_fee numeric(12,0) not null default 0 check (delivery_fee >= 0),
  total numeric(12,0) not null check (total >= 0),
  status text not null default 'new' check (status in ('new', 'confirmed', 'delivered', 'cancelled')),
  payment_method text not null default 'cod',
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  colour_id uuid references public.colours (id) on delete set null,
  colour_note text,                                          -- chosen colour for tinted products
  quantity int not null check (quantity > 0),
  unit_price numeric(12,0) not null check (unit_price >= 0)
);

create index on public.products (category_id);
create index on public.product_variants (product_id);
create index on public.product_images (product_id, sort_order);
create index on public.order_items (order_id);

-- ============ Security (row-level security) ============
alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.colours enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.banners enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Admins can do everything on every table.
do $$
declare t text;
begin
  foreach t in array array['admins','categories','products','colours','product_variants','product_images',
                           'delivery_zones','banners','settings','orders','order_items']
  loop
    execute format('create policy "admin all" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- The public can only read storefront data. Orders and admins are never readable by the public.
-- (Placing an order and tracking one are added in phase 5 through checked server functions.)
create policy "public read" on public.categories for select using (true);
create policy "public read" on public.colours for select using (true);
create policy "public read" on public.settings for select using (true);
create policy "public read" on public.product_images for select using (true);
create policy "public read active" on public.products for select using (is_active);
create policy "public read active" on public.banners for select using (is_active);
create policy "public read active" on public.delivery_zones for select using (is_active);
create policy "public read of active products" on public.product_variants for select
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

-- ============ Image storage ============
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do nothing;

create policy "public read images" on storage.objects for select using (bucket_id = 'images');
create policy "admin insert images" on storage.objects for insert with check (bucket_id = 'images' and public.is_admin());
create policy "admin update images" on storage.objects for update using (bucket_id = 'images' and public.is_admin());
create policy "admin delete images" on storage.objects for delete using (bucket_id = 'images' and public.is_admin());

-- ============ Starter data ============
-- Delivery fees start at 0 so Ali sets the real amounts in the admin.
insert into public.delivery_zones (governorate_ar) values
  ('بغداد'), ('البصرة'), ('نينوى'), ('أربيل'), ('السليمانية'), ('دهوك'),
  ('كركوك'), ('الأنبار'), ('ديالى'), ('صلاح الدين'), ('بابل'), ('كربلاء'),
  ('النجف'), ('واسط'), ('ميسان'), ('ذي قار'), ('المثنى'), ('القادسية');

insert into public.settings (key, value) values
  ('store_name', 'أصباغ الأرجوان'),
  ('whatsapp_number', '009647838232417'),
  ('guarantee_text', ''),
  ('opening_hours', '');
