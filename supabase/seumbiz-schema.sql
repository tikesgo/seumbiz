-- SeumBiz Supabase schema draft
-- Do not run in production until RLS, indexes, policies, and migration order are reviewed.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.biz_companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  manager_name text not null,
  phone text not null,
  kakao_id text,
  default_rate numeric(5,2) not null default 90.00 check (default_rate >= 0 and default_rate <= 100),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  memo text,
  approved_at timestamptz,
  rejected_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.biz_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  company_id uuid references public.biz_companies(id) on delete cascade,
  login_id text not null unique,
  password_hash text,
  name text not null,
  phone text,
  role text not null default 'company_user' check (role in ('company_user', 'company_staff', 'company_owner', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biz_users_company_required_by_role check (
    (role = 'admin' and company_id is null)
    or (role in ('company_user', 'company_staff', 'company_owner') and company_id is not null)
  )
);

create table if not exists public.biz_telegram_recipients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chat_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint biz_telegram_recipients_name_not_blank check (length(trim(name)) > 0),
  constraint biz_telegram_recipients_chat_id_not_blank check (length(trim(chat_id)) > 0)
);

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

create table if not exists public.biz_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id) on delete restrict,
  requested_by uuid references public.biz_users(id) on delete set null,
  receipt_no text not null unique,
  giftcard_type text not null,
  giftcard_code text,
  giftcard_name_snapshot text,
  giftcard_logo_url_snapshot text,
  giftcard_rate_snapshot numeric(5,2),
  item_count integer not null default 0 check (item_count >= 0),
  total_face_value numeric(14,0) not null default 0 check (total_face_value >= 0),
  applied_rate numeric(5,2) not null check (applied_rate >= 0 and applied_rate <= 100),
  expected_settlement_amount numeric(14,0) not null default 0 check (expected_settlement_amount >= 0),
  approved_settlement_amount numeric(14,0) check (approved_settlement_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'rejected', 'canceled')),
  submitted_memo text,
  admin_memo text,
  reviewed_by uuid references public.biz_users(id) on delete set null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.biz_purchase_requests
  add column if not exists giftcard_code text,
  add column if not exists giftcard_name_snapshot text,
  add column if not exists giftcard_logo_url_snapshot text,
  add column if not exists giftcard_rate_snapshot numeric(5,2);

create table if not exists public.biz_purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.biz_purchase_requests(id) on delete cascade,
  company_id uuid not null references public.biz_companies(id) on delete restrict,
  giftcard_type text not null,
  pin_no text not null,
  face_value numeric(14,0) check (face_value >= 0),
  ocr_source text,
  ocr_confidence numeric(5,2) check (ocr_confidence is null or (ocr_confidence >= 0 and ocr_confidence <= 100)),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'rejected', 'canceled')),
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.biz_balance_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id) on delete restrict,
  purchase_request_id uuid references public.biz_purchase_requests(id) on delete set null,
  withdraw_request_id uuid,
  amount numeric(14,0) not null check (amount <> 0),
  ledger_type text not null check (
    ledger_type in (
      'purchase_approved',
      'withdraw_completed',
      'admin_deduct',
      'admin_advance',
      'admin_restore',
      'manual_adjust'
    )
  ),
  reason text not null,
  memo text,
  created_by uuid references public.biz_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biz_balance_ledger_purchase_positive check (
    ledger_type <> 'purchase_approved' or amount > 0
  ),
  constraint biz_balance_ledger_withdraw_negative check (
    ledger_type <> 'withdraw_completed' or amount < 0
  ),
  constraint biz_balance_ledger_deduct_negative check (
    ledger_type <> 'admin_deduct' or amount < 0
  ),
  constraint biz_balance_ledger_advance_negative check (
    ledger_type <> 'admin_advance' or amount < 0
  ),
  constraint biz_balance_ledger_restore_positive check (
    ledger_type <> 'admin_restore' or amount > 0
  )
);

create table if not exists public.biz_withdraw_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id) on delete restrict,
  requested_by uuid references public.biz_users(id) on delete set null,
  amount numeric(14,0) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected', 'canceled')),
  memo text,
  admin_memo text,
  processed_by uuid references public.biz_users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.biz_balance_ledger
  drop constraint if exists biz_balance_ledger_withdraw_request_fk;

alter table public.biz_balance_ledger
  add constraint biz_balance_ledger_withdraw_request_fk
  foreign key (withdraw_request_id)
  references public.biz_withdraw_requests(id)
  on delete set null;

create table if not exists public.biz_admin_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.biz_companies(id) on delete set null,
  admin_user_id uuid references public.biz_users(id) on delete set null,
  target_table text not null,
  target_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_biz_users_company_id on public.biz_users(company_id);
create index if not exists idx_biz_users_auth_user_id on public.biz_users(auth_user_id);
create unique index if not exists uq_biz_telegram_recipients_chat_id on public.biz_telegram_recipients(chat_id);
create index if not exists idx_biz_giftcard_types_visible_active_sort on public.biz_giftcard_types(is_visible, is_active, sort_order);
create index if not exists idx_biz_giftcard_types_sort_order on public.biz_giftcard_types(sort_order);
create index if not exists idx_biz_purchase_requests_company_id on public.biz_purchase_requests(company_id);
create index if not exists idx_biz_purchase_requests_status on public.biz_purchase_requests(status);
create index if not exists idx_biz_purchase_requests_receipt_no on public.biz_purchase_requests(receipt_no);
create index if not exists idx_biz_purchase_requests_giftcard_code on public.biz_purchase_requests(giftcard_code);
create index if not exists idx_biz_purchase_items_request_id on public.biz_purchase_items(purchase_request_id);
create index if not exists idx_biz_purchase_items_company_id on public.biz_purchase_items(company_id);
create index if not exists idx_biz_balance_ledger_company_id on public.biz_balance_ledger(company_id);
create index if not exists idx_biz_balance_ledger_created_at on public.biz_balance_ledger(created_at);
create unique index if not exists uq_ledger_purchase_approved_once
on public.biz_balance_ledger (purchase_request_id)
where ledger_type = 'purchase_approved'
  and purchase_request_id is not null;
create unique index if not exists uq_ledger_withdraw_completed_once
on public.biz_balance_ledger (withdraw_request_id)
where ledger_type = 'withdraw_completed'
  and withdraw_request_id is not null;
create index if not exists idx_biz_withdraw_requests_company_id on public.biz_withdraw_requests(company_id);
create index if not exists idx_biz_withdraw_requests_status on public.biz_withdraw_requests(status);
create index if not exists idx_biz_admin_logs_company_id on public.biz_admin_logs(company_id);

drop trigger if exists set_biz_companies_updated_at on public.biz_companies;
create trigger set_biz_companies_updated_at
before update on public.biz_companies
for each row execute function public.set_updated_at();

drop trigger if exists set_biz_users_updated_at on public.biz_users;
create trigger set_biz_users_updated_at
before update on public.biz_users
for each row execute function public.set_updated_at();

drop trigger if exists set_biz_giftcard_types_updated_at on public.biz_giftcard_types;
create trigger set_biz_giftcard_types_updated_at
before update on public.biz_giftcard_types
for each row execute function public.set_updated_at();

drop trigger if exists set_biz_purchase_requests_updated_at on public.biz_purchase_requests;
create trigger set_biz_purchase_requests_updated_at
before update on public.biz_purchase_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_biz_purchase_items_updated_at on public.biz_purchase_items;
create trigger set_biz_purchase_items_updated_at
before update on public.biz_purchase_items
for each row execute function public.set_updated_at();

drop trigger if exists set_biz_balance_ledger_updated_at on public.biz_balance_ledger;
create trigger set_biz_balance_ledger_updated_at
before update on public.biz_balance_ledger
for each row execute function public.set_updated_at();

drop trigger if exists set_biz_withdraw_requests_updated_at on public.biz_withdraw_requests;
create trigger set_biz_withdraw_requests_updated_at
before update on public.biz_withdraw_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_biz_admin_logs_updated_at on public.biz_admin_logs;
create trigger set_biz_admin_logs_updated_at
before update on public.biz_admin_logs
for each row execute function public.set_updated_at();

create or replace view public.biz_company_balances as
select
  c.id as company_id,
  c.company_name,
  coalesce(sum(l.amount), 0) as balance_amount
from public.biz_companies c
left join public.biz_balance_ledger l on l.company_id = c.id
group by c.id, c.company_name;

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

comment on table public.biz_companies is 'SeumBiz company master. No balance column; balance is calculated from biz_balance_ledger.';
comment on table public.biz_giftcard_types is 'SEUMBiz gift card master. Gift cards are managed by code and logo_url is required.';
comment on table public.biz_purchase_requests is 'Purchase request receipt-level table. applied_rate is fixed at request time.';
comment on column public.biz_purchase_requests.giftcard_type is 'Legacy compatibility display value. New requests store the gift card name snapshot here temporarily.';
comment on column public.biz_purchase_requests.giftcard_code is 'Gift card master code selected at request time.';
comment on column public.biz_purchase_requests.giftcard_name_snapshot is 'Gift card name snapshot at request time.';
comment on column public.biz_purchase_requests.giftcard_logo_url_snapshot is 'Gift card logo URL snapshot at request time.';
comment on column public.biz_purchase_requests.giftcard_rate_snapshot is 'Gift card default rate snapshot at request time.';
comment on table public.biz_purchase_items is 'Gift card item-level table under a purchase request.';
comment on table public.biz_balance_ledger is 'Company balance ledger. The sum of amount is the source of truth.';
comment on table public.biz_withdraw_requests is 'Withdrawal request table. No bank account data is stored.';
