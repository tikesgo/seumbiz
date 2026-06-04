-- SEUMBiz gift card master migration
-- Run after seumbiz-schema.sql has created public.set_updated_at().
-- Do not mix this with legacy SeumGift gift_cards tables.

create table if not exists public.biz_giftcard_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  logo_url text not null,
  default_rate numeric(5,2) not null,
  enabled_amounts jsonb not null default '[]'::jsonb,
  is_visible boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biz_giftcard_types_code_format check (code ~ '^[A-Z0-9_]+$'),
  constraint biz_giftcard_types_name_not_blank check (length(trim(name)) > 0),
  constraint biz_giftcard_types_logo_url_not_blank check (length(trim(logo_url)) > 0),
  constraint biz_giftcard_types_default_rate_range check (default_rate > 0 and default_rate <= 100),
  constraint biz_giftcard_types_enabled_amounts_array check (jsonb_typeof(enabled_amounts) = 'array')
);

alter table public.biz_purchase_requests
  add column if not exists giftcard_code text,
  add column if not exists giftcard_name_snapshot text,
  add column if not exists giftcard_logo_url_snapshot text,
  add column if not exists giftcard_rate_snapshot numeric(5,2);

create index if not exists idx_biz_giftcard_types_visible_active_sort
on public.biz_giftcard_types(is_visible, is_active, sort_order);

create index if not exists idx_biz_giftcard_types_sort_order
on public.biz_giftcard_types(sort_order);

create index if not exists idx_biz_purchase_requests_giftcard_code
on public.biz_purchase_requests(giftcard_code);

drop trigger if exists set_biz_giftcard_types_updated_at on public.biz_giftcard_types;
create trigger set_biz_giftcard_types_updated_at
before update on public.biz_giftcard_types
for each row execute function public.set_updated_at();

insert into public.biz_giftcard_types
  (code, name, logo_url, default_rate, enabled_amounts, is_visible, is_active, sort_order)
values
  ('LOTTE', '롯데상품권', '/assets/giftcards/lotte.png', 92.00, '[100000,300000,500000]'::jsonb, true, true, 10),
  ('CULTURE', '컬쳐랜드', '/assets/giftcards/culture.png', 91.00, '[100000,300000,500000]'::jsonb, true, true, 20),
  ('BOOK', '북앤라이프', '/assets/giftcards/book.png', 90.00, '[100000,300000]'::jsonb, true, true, 30),
  ('HAPPY', '해피머니', '/assets/giftcards/happy.png', 90.00, '[100000,300000]'::jsonb, true, true, 40)
on conflict (code) do update
set
  name = excluded.name,
  logo_url = excluded.logo_url,
  default_rate = excluded.default_rate,
  enabled_amounts = excluded.enabled_amounts,
  sort_order = excluded.sort_order,
  updated_at = now();

comment on table public.biz_giftcard_types is 'SEUMBiz gift card master. Gift cards are managed by code and logo_url is required.';
