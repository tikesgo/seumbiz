-- Deploy: allow withdraw request/complete when company balance is negative.
-- Run in Supabase SQL Editor after review.
-- Does NOT change reject_withdraw_request, purchase RPCs, or manual adjustment RPC.

create or replace function public.create_withdraw_request(
  p_amount numeric,
  p_memo text default null
)
returns table (
  withdraw_request_id uuid,
  company_id uuid,
  amount numeric,
  current_balance numeric,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;
  v_company_id uuid;
  v_amount numeric(14,0);
  v_current_balance numeric(14,0);
  v_withdraw_request_id uuid;
begin
  if v_auth_user_id is null then
    raise exception 'Authentication required';
  end if;

  select u.id, u.company_id
    into v_user_id, v_company_id
  from public.biz_users u
  join public.biz_companies c on c.id = u.company_id
  where u.auth_user_id = v_auth_user_id
    and u.status = 'approved'
    and u.role in ('company_owner', 'company_staff', 'company_user')
    and c.status = 'approved'
  limit 1;

  if v_company_id is null then
    raise exception 'Approved company user not found';
  end if;

  if p_amount is null then
    raise exception 'amount is required';
  end if;

  v_amount := p_amount::numeric(14,0);

  if v_amount <= 0 then
    raise exception 'amount must be greater than 0';
  end if;

  select coalesce(sum(l.amount), 0)::numeric(14,0)
    into v_current_balance
  from public.biz_balance_ledger l
  where l.company_id = v_company_id;

  insert into public.biz_withdraw_requests (
    company_id,
    requested_by,
    amount,
    status,
    memo
  )
  values (
    v_company_id,
    v_user_id,
    v_amount,
    'pending',
    p_memo
  )
  returning id into v_withdraw_request_id;

  return query
  select
    v_withdraw_request_id,
    v_company_id,
    v_amount,
    v_current_balance,
    'pending'::text;
end;
$$;

comment on function public.create_withdraw_request(numeric, text)
is 'Creates a pending withdraw request without changing the balance ledger. Intended for approved company users.';

revoke all on function public.create_withdraw_request(numeric, text) from public;
revoke all on function public.create_withdraw_request(numeric, text) from anon;
grant execute on function public.create_withdraw_request(numeric, text) to authenticated;

create or replace function public.complete_withdraw_request(
  p_withdraw_request_id uuid,
  p_admin_memo text default null
)
returns table (
  withdraw_request_id uuid,
  company_id uuid,
  amount numeric,
  current_balance_before numeric,
  current_balance_after numeric,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_auth_user_id uuid := auth.uid();
  v_admin_user_id uuid;
  v_is_admin boolean := false;
  v_withdraw public.biz_withdraw_requests%rowtype;
  v_current_balance numeric(14,0);
  v_ledger_id uuid;
begin
  if v_admin_auth_user_id is null then
    raise exception 'Authentication required';
  end if;

  select u.id
    into v_admin_user_id
  from public.biz_users u
  where u.auth_user_id = v_admin_auth_user_id
    and u.status = 'approved'
    and u.role = 'admin'
  limit 1;

  v_is_admin := v_admin_user_id is not null;

  if not v_is_admin then
    raise exception 'Admin role required';
  end if;

  if p_withdraw_request_id is null then
    raise exception 'withdraw_request_id is required';
  end if;

  select *
    into v_withdraw
  from public.biz_withdraw_requests wr
  where wr.id = p_withdraw_request_id
  for update;

  if not found then
    raise exception 'Withdraw request not found';
  end if;

  if v_withdraw.status = 'completed' then
    raise exception 'Withdraw request is already completed';
  end if;

  if v_withdraw.status not in ('pending') then
    raise exception 'Only pending withdraw requests can be completed';
  end if;

  select coalesce(sum(l.amount), 0)::numeric(14,0)
    into v_current_balance
  from public.biz_balance_ledger l
  where l.company_id = v_withdraw.company_id;

  update public.biz_withdraw_requests
  set
    status = 'completed',
    admin_memo = p_admin_memo,
    processed_by = v_admin_user_id,
    processed_at = now(),
    updated_at = now()
  where id = p_withdraw_request_id;

  insert into public.biz_balance_ledger (
    company_id,
    withdraw_request_id,
    amount,
    ledger_type,
    reason,
    memo,
    created_by
  )
  values (
    v_withdraw.company_id,
    v_withdraw.id,
    -v_withdraw.amount,
    'withdraw_completed',
    'Withdraw completed',
    p_admin_memo,
    v_admin_user_id
  )
  returning id into v_ledger_id;

  insert into public.biz_admin_logs (
    company_id,
    admin_user_id,
    target_table,
    target_id,
    action,
    before_data,
    after_data,
    memo
  )
  values (
    v_withdraw.company_id,
    v_admin_user_id,
    'biz_withdraw_requests',
    v_withdraw.id,
    'withdraw_completed',
    jsonb_build_object(
      'status', v_withdraw.status,
      'amount', v_withdraw.amount,
      'balance_before', v_current_balance
    ),
    jsonb_build_object(
      'status', 'completed',
      'amount', v_withdraw.amount,
      'balance_after', (v_current_balance - v_withdraw.amount)::numeric(14,0),
      'ledger_id', v_ledger_id
    ),
    p_admin_memo
  );

  return query
  select
    v_withdraw.id,
    v_withdraw.company_id,
    v_withdraw.amount,
    v_current_balance,
    (v_current_balance - v_withdraw.amount)::numeric(14,0),
    v_ledger_id;
end;
$$;

comment on function public.complete_withdraw_request(uuid, text)
is 'Completes a pending withdraw request and creates a withdraw_completed negative balance ledger row in one transaction. Intended for admin users.';

revoke all on function public.complete_withdraw_request(uuid, text) from public;
revoke all on function public.complete_withdraw_request(uuid, text) from anon;
grant execute on function public.complete_withdraw_request(uuid, text) to authenticated;
