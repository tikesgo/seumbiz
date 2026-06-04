-- SeumBiz RLS draft
-- Review before running in Supabase SQL Editor.
-- Assumption: public.biz_users.auth_user_id is the same UUID as auth.users.id.
-- Do not expose password_hash or other sensitive biz_users columns through helper functions.

create or replace function public.current_biz_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.biz_users u
  where u.auth_user_id = auth.uid()
    and u.status = 'approved'
    and u.role in ('company_owner', 'company_staff', 'company_user')
  limit 1;
$$;

create or replace function public.current_biz_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.company_id
  from public.biz_users u
  where u.auth_user_id = auth.uid()
    and u.status = 'approved'
    and u.role in ('company_owner', 'company_staff', 'company_user')
  limit 1;
$$;

create or replace function public.is_biz_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.biz_users u
    where u.auth_user_id = auth.uid()
      and u.status = 'approved'
      and u.role = 'admin'
  );
$$;

alter table public.biz_companies enable row level security;
alter table public.biz_users enable row level security;
alter table public.biz_giftcard_types enable row level security;
alter table public.biz_purchase_requests enable row level security;
alter table public.biz_purchase_items enable row level security;
alter table public.biz_balance_ledger enable row level security;
alter table public.biz_withdraw_requests enable row level security;
alter table public.biz_admin_logs enable row level security;

drop policy if exists "biz_giftcard_types_select_active_visible_or_admin" on public.biz_giftcard_types;
create policy "biz_giftcard_types_select_active_visible_or_admin"
on public.biz_giftcard_types
for select
to authenticated
using (
  public.is_biz_admin()
  or (
    is_visible = true
    and is_active = true
    and public.current_biz_company_id() is not null
  )
);

drop policy if exists "biz_giftcard_types_admin_insert" on public.biz_giftcard_types;
create policy "biz_giftcard_types_admin_insert"
on public.biz_giftcard_types
for insert
to authenticated
with check (public.is_biz_admin());

drop policy if exists "biz_giftcard_types_admin_update" on public.biz_giftcard_types;
create policy "biz_giftcard_types_admin_update"
on public.biz_giftcard_types
for update
to authenticated
using (public.is_biz_admin())
with check (public.is_biz_admin());

drop policy if exists "biz_giftcard_types_no_delete" on public.biz_giftcard_types;
create policy "biz_giftcard_types_no_delete"
on public.biz_giftcard_types
for delete
to authenticated
using (false);

drop policy if exists "biz_companies_select_own_or_admin" on public.biz_companies;
create policy "biz_companies_select_own_or_admin"
on public.biz_companies
for select
to authenticated
using (
  public.is_biz_admin()
  or id = public.current_biz_company_id()
);

drop policy if exists "biz_companies_admin_insert" on public.biz_companies;
create policy "biz_companies_admin_insert"
on public.biz_companies
for insert
to authenticated
with check (public.is_biz_admin());

drop policy if exists "biz_companies_admin_update" on public.biz_companies;
create policy "biz_companies_admin_update"
on public.biz_companies
for update
to authenticated
using (public.is_biz_admin())
with check (public.is_biz_admin());

drop policy if exists "biz_companies_admin_delete" on public.biz_companies;
create policy "biz_companies_admin_delete"
on public.biz_companies
for delete
to authenticated
using (public.is_biz_admin());

drop policy if exists "biz_users_select_own_company_or_admin" on public.biz_users;
drop policy if exists "biz_users_select_self_or_admin" on public.biz_users;
create policy "biz_users_select_self_or_admin"
on public.biz_users
for select
to authenticated
using (
  public.is_biz_admin()
  or auth_user_id = auth.uid()
);

drop policy if exists "biz_users_admin_insert" on public.biz_users;
create policy "biz_users_admin_insert"
on public.biz_users
for insert
to authenticated
with check (public.is_biz_admin());

drop policy if exists "biz_users_admin_update" on public.biz_users;
create policy "biz_users_admin_update"
on public.biz_users
for update
to authenticated
using (public.is_biz_admin())
with check (public.is_biz_admin());

drop policy if exists "biz_users_admin_delete" on public.biz_users;
create policy "biz_users_admin_delete"
on public.biz_users
for delete
to authenticated
using (public.is_biz_admin());

drop policy if exists "biz_purchase_requests_select_own_or_admin" on public.biz_purchase_requests;
create policy "biz_purchase_requests_select_own_or_admin"
on public.biz_purchase_requests
for select
to authenticated
using (
  public.is_biz_admin()
  or company_id = public.current_biz_company_id()
);

drop policy if exists "biz_purchase_requests_insert_own_or_admin" on public.biz_purchase_requests;
create policy "biz_purchase_requests_insert_own_or_admin"
on public.biz_purchase_requests
for insert
to authenticated
with check (
  public.is_biz_admin()
  or (
    company_id = public.current_biz_company_id()
    and requested_by = public.current_biz_user_id()
    and status = 'pending'
  )
);

drop policy if exists "biz_purchase_requests_admin_update" on public.biz_purchase_requests;
create policy "biz_purchase_requests_admin_update"
on public.biz_purchase_requests
for update
to authenticated
using (public.is_biz_admin())
with check (public.is_biz_admin());

drop policy if exists "biz_purchase_requests_admin_delete" on public.biz_purchase_requests;
create policy "biz_purchase_requests_admin_delete"
on public.biz_purchase_requests
for delete
to authenticated
using (public.is_biz_admin());

drop policy if exists "biz_purchase_items_select_own_or_admin" on public.biz_purchase_items;
create policy "biz_purchase_items_select_own_or_admin"
on public.biz_purchase_items
for select
to authenticated
using (
  public.is_biz_admin()
  or company_id = public.current_biz_company_id()
);

drop policy if exists "biz_purchase_items_insert_own_or_admin" on public.biz_purchase_items;
drop policy if exists "biz_purchase_items_admin_insert" on public.biz_purchase_items;
create policy "biz_purchase_items_admin_insert"
on public.biz_purchase_items
for insert
to authenticated
with check (public.is_biz_admin());

drop policy if exists "biz_purchase_items_admin_update" on public.biz_purchase_items;
create policy "biz_purchase_items_admin_update"
on public.biz_purchase_items
for update
to authenticated
using (public.is_biz_admin())
with check (public.is_biz_admin());

drop policy if exists "biz_purchase_items_admin_delete" on public.biz_purchase_items;
create policy "biz_purchase_items_admin_delete"
on public.biz_purchase_items
for delete
to authenticated
using (public.is_biz_admin());

drop policy if exists "biz_balance_ledger_select_own_or_admin" on public.biz_balance_ledger;
create policy "biz_balance_ledger_select_own_or_admin"
on public.biz_balance_ledger
for select
to authenticated
using (
  public.is_biz_admin()
  or company_id = public.current_biz_company_id()
);

drop policy if exists "biz_balance_ledger_admin_insert" on public.biz_balance_ledger;
create policy "biz_balance_ledger_admin_insert"
on public.biz_balance_ledger
for insert
to authenticated
with check (public.is_biz_admin());

drop policy if exists "biz_balance_ledger_admin_update" on public.biz_balance_ledger;
drop policy if exists "biz_balance_ledger_no_update" on public.biz_balance_ledger;
create policy "biz_balance_ledger_no_update"
on public.biz_balance_ledger
for update
to authenticated
using (false)
with check (false);

drop policy if exists "biz_balance_ledger_admin_delete" on public.biz_balance_ledger;
drop policy if exists "biz_balance_ledger_no_delete" on public.biz_balance_ledger;
create policy "biz_balance_ledger_no_delete"
on public.biz_balance_ledger
for delete
to authenticated
using (false);

drop policy if exists "biz_withdraw_requests_select_own_or_admin" on public.biz_withdraw_requests;
create policy "biz_withdraw_requests_select_own_or_admin"
on public.biz_withdraw_requests
for select
to authenticated
using (
  public.is_biz_admin()
  or company_id = public.current_biz_company_id()
);

drop policy if exists "biz_withdraw_requests_insert_own_or_admin" on public.biz_withdraw_requests;
create policy "biz_withdraw_requests_insert_own_or_admin"
on public.biz_withdraw_requests
for insert
to authenticated
with check (
  public.is_biz_admin()
  or (
    company_id = public.current_biz_company_id()
    and requested_by = public.current_biz_user_id()
    and status = 'pending'
  )
);

drop policy if exists "biz_withdraw_requests_admin_update" on public.biz_withdraw_requests;
create policy "biz_withdraw_requests_admin_update"
on public.biz_withdraw_requests
for update
to authenticated
using (public.is_biz_admin())
with check (public.is_biz_admin());

drop policy if exists "biz_withdraw_requests_admin_delete" on public.biz_withdraw_requests;
create policy "biz_withdraw_requests_admin_delete"
on public.biz_withdraw_requests
for delete
to authenticated
using (public.is_biz_admin());

drop policy if exists "biz_admin_logs_admin_select" on public.biz_admin_logs;
create policy "biz_admin_logs_admin_select"
on public.biz_admin_logs
for select
to authenticated
using (public.is_biz_admin());

drop policy if exists "biz_admin_logs_admin_insert" on public.biz_admin_logs;
create policy "biz_admin_logs_admin_insert"
on public.biz_admin_logs
for insert
to authenticated
with check (public.is_biz_admin());

drop policy if exists "biz_admin_logs_admin_update" on public.biz_admin_logs;
drop policy if exists "biz_admin_logs_no_update" on public.biz_admin_logs;
create policy "biz_admin_logs_no_update"
on public.biz_admin_logs
for update
to authenticated
using (false)
with check (false);

drop policy if exists "biz_admin_logs_admin_delete" on public.biz_admin_logs;
drop policy if exists "biz_admin_logs_no_delete" on public.biz_admin_logs;
create policy "biz_admin_logs_no_delete"
on public.biz_admin_logs
for delete
to authenticated
using (false);

-- View access note:
-- PostgreSQL views do not have their own RLS policies.
-- biz_company_balances relies on biz_companies and biz_balance_ledger RLS.
-- Supabase/PostgreSQL 15+ supports security_invoker views.
create or replace view public.biz_company_balances
with (security_invoker = true)
as
select
  c.id as company_id,
  c.company_name,
  coalesce(sum(l.amount), 0) as balance_amount
from public.biz_companies c
left join public.biz_balance_ledger l on l.company_id = c.id
group by c.id, c.company_name;
