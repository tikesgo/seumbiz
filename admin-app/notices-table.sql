create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  is_important boolean not null default false,
  is_visible boolean not null default true,
  scheduled_at timestamptz,
  attachment_url text,
  attachment_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notices
  add column if not exists scheduled_at timestamptz,
  add column if not exists attachment_url text,
  add column if not exists attachment_name text;

create index if not exists notices_visible_order_idx
  on public.notices (is_visible, is_important desc, created_at desc);
