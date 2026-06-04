-- SEUMBiz Telegram notification recipients
-- Run this in the SEUMBiz Supabase project only.

create table if not exists public.biz_telegram_recipients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chat_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint biz_telegram_recipients_name_not_blank check (length(trim(name)) > 0),
  constraint biz_telegram_recipients_chat_id_not_blank check (length(trim(chat_id)) > 0)
);

create unique index if not exists uq_biz_telegram_recipients_chat_id
on public.biz_telegram_recipients (chat_id);

alter table public.biz_telegram_recipients enable row level security;

comment on table public.biz_telegram_recipients is 'SEUMBiz Telegram notification recipients managed from SEUMBiz admin.';
