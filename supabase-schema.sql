-- VoltReserve , products table schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists products (
  id text primary key,
  series text not null,
  capacity_tier text,
  name text not null,
  tagline text,
  capacity_wh integer,
  capacity_label text,
  output_w integer,
  output_label text,
  charge_time text,
  weight text,
  price numeric not null,
  ecoflow_price numeric,
  use_case text,
  badge text,
  description text,
  hook text,
  bullets jsonb not null default '[]'::jsonb,
  who_for jsonb not null default '[]'::jsonb,
  whats_in_box text,
  in_stock boolean not null default true,
  images jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Safe to re-run: adds the new columns if you already created this table
-- before hook/bullets existed.
alter table products add column if not exists hook text;
alter table products add column if not exists bullets jsonb not null default '[]'::jsonb;
alter table products add column if not exists who_for jsonb not null default '[]'::jsonb;
alter table products add column if not exists whats_in_box text;
alter table products add column if not exists in_stock boolean not null default true;

-- Keep updated_at fresh on every edit
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- Row Level Security: the site only ever reads products through the
-- Netlify Function (which uses the service role key), so we lock the
-- table down completely and let the function do the work.
alter table products enable row level security;

-- No public policies are created on purpose , all access goes through
-- netlify/functions/products.js using the service role key, which
-- bypasses RLS. This keeps the table unreachable directly from the browser.

-- ============================================
-- Order log. send-order.js writes here in addition to sending the two
-- Resend emails, so there's a persistent record of every submitted order
-- independent of email delivery - previously there was none at all, the
-- emails were the only record. Same locked-down access pattern as the
-- tables above, only reachable through the service role key.
-- ============================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  phone text,
  country text,
  address text,
  payment_method text,
  promo_code text,
  notes text,
  item_lines jsonb not null default '[]'::jsonb,
  subtotal numeric,
  discount_percent numeric,
  discount_amount numeric,
  shipping_type text,
  shipping_cost numeric,
  total numeric,
  emails_sent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;
-- No public policies, on purpose, same reasoning as the tables above.

-- ============================================
-- Site-wide settings (currently just the promo config: code, discount
-- percentages, thresholds, end date). Lets admin.html change the promo
-- without a redeploy. Same access pattern as products, locked down and
-- only reachable through netlify/functions/settings.js.
-- ============================================
create table if not exists site_settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;
-- No public policies, on purpose, same reasoning as the products table.

drop trigger if exists site_settings_set_updated_at on site_settings;
create trigger site_settings_set_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

-- ============================================
-- Accessories and Solar Panels. These previously existed ONLY as static
-- arrays in js/products-data.js with zero admin panel management - adding
-- or changing one meant editing code and redeploying, unlike Products
-- which have been admin-editable all along. Same shape/access pattern as
-- the products table above.
-- ============================================
create table if not exists accessories (
  id text primary key,
  category text,
  name text not null,
  tagline text,
  price numeric not null,
  compatible_with jsonb not null default '[]'::jsonb,
  description text,
  images jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table accessories enable row level security;
-- No public policies, on purpose - same reasoning as products.

drop trigger if exists accessories_set_updated_at on accessories;
create trigger accessories_set_updated_at
  before update on accessories
  for each row execute function set_updated_at();

create table if not exists solar_panels (
  id text primary key,
  name text not null,
  tagline text,
  watts integer,
  price numeric not null,
  compatible_with jsonb not null default '[]'::jsonb,
  description text,
  images jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table solar_panels enable row level security;
-- No public policies, on purpose - same reasoning as products.

drop trigger if exists solar_panels_set_updated_at on solar_panels;
create trigger solar_panels_set_updated_at
  before update on solar_panels
  for each row execute function set_updated_at();

-- ============================================
-- Power Kits (bundles). Previously these ONLY existed as a static BUNDLES
-- array in js/products-data.js with no admin tab at all - unlike Products,
-- Accessories, and Solar Panels, changing a kit meant editing code and
-- redeploying. Same shape/access pattern as accessories/solar_panels
-- above, except `image` is a single path (kits show one hero photo, not a
-- gallery) and `accessories` here is free-text labels shown on the card
-- ("+ RIVER 3 Waterproof Bag"), not real accessory table IDs.
-- ============================================
create table if not exists bundles (
  id text primary key,
  name text not null,
  tagline text,
  product_id text,
  accessories jsonb not null default '[]'::jsonb,
  price numeric not null,
  compare_at numeric,
  badge text,
  use_case text,
  description text,
  image text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table bundles enable row level security;
-- No public policies, on purpose - same reasoning as products.

drop trigger if exists bundles_set_updated_at on bundles;
create trigger bundles_set_updated_at
  before update on bundles
  for each row execute function set_updated_at();

-- ============================================
-- Contact form message log. send-contact.js writes here before sending
-- the two Resend emails, so there's a persistent record of every message
-- independent of email delivery - previously the two emails were the only
-- trace, exactly the same gap orders had before the orders table existed.
-- ============================================
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  message text not null,
  emails_sent boolean not null default false,
  created_at timestamptz not null default now()
);
alter table contact_messages enable row level security;
-- No public policies, on purpose, same reasoning as the orders table.

-- ============================================
-- Storage bucket for admin-uploaded files (product/accessory/solar-panel
-- photos). Public read (photos need to be viewable by any site visitor),
-- writes only via the service-role key (see admin-upload.js) - the same
-- access pattern as every other admin-only write path in this file.
-- ============================================
insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', true)
on conflict (id) do nothing;

drop policy if exists "public read product-files" on storage.objects;
create policy "public read product-files" on storage.objects
  for select using (bucket_id = 'product-files');
-- No public insert/update/delete policy, on purpose - uploads only ever
-- go through admin-upload.js using the service role key, which bypasses
-- RLS entirely.
