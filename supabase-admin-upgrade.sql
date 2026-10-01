-- VoltReserve, admin panel upgrade
-- Run this ONCE in the Supabase SQL editor (Project > SQL Editor > New query).
-- It is safe to run again later: everything uses "if not exists".
--
-- Run it AFTER supabase-schema.sql (the original tables must exist first).
--
-- What it adds:
--   notifications   every order / contact submission + whether its emails went out
--   admin_log       change history for the admin panel (with "restore" copies)
--   blog_posts      posts written in the admin panel's Blog tab
--   new columns     order status + tracking, message status, stock quantities,
--                   featured flags
--
-- Nothing here changes how the public site looks or works by itself.

-- ============================================
-- Notifications: one row per order / contact submission.
-- `payload` holds the full submission so the emails can be re-sent from the
-- admin panel even if the order/message row itself failed to save.
-- ============================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,                       -- 'order' | 'contact'
  ref_id uuid,                              -- orders.id or contact_messages.id when saved
  title text not null,
  summary text,
  status text not null default 'sent',      -- 'sent' | 'partial' | 'failed'
  owner_sent boolean not null default false,
  customer_sent boolean not null default false,
  error text,
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  resent_count integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on notifications (created_at desc);
create index if not exists notifications_unread_idx on notifications (read, created_at desc);
alter table notifications enable row level security;
-- No public policies, on purpose: only reachable through the service role key.

-- ============================================
-- Change log
-- ============================================
create table if not exists admin_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity text not null,
  entity_id text,
  summary text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_created_idx on admin_log (created_at desc);
alter table admin_log enable row level security;

-- ============================================
-- Orders: status, tracking, private notes, structured items (for stock)
-- ============================================
alter table orders add column if not exists status text not null default 'new';
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists tracking_url text;
alter table orders add column if not exists admin_notes text;
alter table orders add column if not exists items jsonb not null default '[]'::jsonb;
alter table orders add column if not exists stock_applied boolean not null default false;
alter table orders add column if not exists updated_at timestamptz;

-- ============================================
-- Contact messages: status + private notes
-- ============================================
alter table contact_messages add column if not exists status text not null default 'new';
alter table contact_messages add column if not exists admin_notes text;
alter table contact_messages add column if not exists replied_at timestamptz;

-- ============================================
-- Stock quantities (optional: empty = not quantity-tracked) and featured flags
-- ============================================
alter table products add column if not exists stock_qty integer;
alter table products add column if not exists featured boolean not null default false;
alter table accessories add column if not exists stock_qty integer;
alter table solar_panels add column if not exists stock_qty integer;
alter table bundles add column if not exists featured boolean not null default false;

-- ============================================
-- Blog posts written in the admin panel. The 9 original guides stay as
-- regular pages; posts created here live at /blog/<slug>.
-- ============================================
create table if not exists blog_posts (
  slug text primary key,
  title text not null,
  description text,                         -- meta description / search snippet
  excerpt text,                             -- short blurb for the guides list
  body text not null default '',            -- simple HTML (paragraphs, headings, links, lists)
  cover_image text,
  category text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_published_idx on blog_posts (published, published_at desc);
alter table blog_posts enable row level security;

drop trigger if exists blog_posts_set_updated_at on blog_posts;
create trigger blog_posts_set_updated_at
  before update on blog_posts
  for each row execute function set_updated_at();
