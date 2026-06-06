-- Deploy only: create_manual_ledger_adjustment (allow negative balance on manual debit)
-- Run in Supabase SQL Editor after review.
-- Does NOT modify complete_withdraw_request or create_withdraw_request.

create or replace function public.create_manual_ledger_adjustment(
  p_company_id uuid,
  p_adjustment_type text,
  p_amount numeric,
  p_reason text,
  p_admin_memo text default null
)
returns table (
  company_id uuid,
  adjustment_type text,
  amount numeric,
  signed_amount numeric,
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
  v_adjustment_type text;
  v_amount numeric(14,0);
  v_signed_amount numeric(14,0);
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

  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  v_adjustment_type := lower(btrim(coalesce(p_adjustment_type, '')));

  if v_adjustment_type not in ('credit', 'debit') then
    raise exception 'adjustment_type must be credit or debit';
  end if;

  if p_amount is null then
    raise exception 'amount is required';
  end if;

  v_amount := p_amount::numeric(14,0);

  if v_amount <= 0 then
    raise exception 'amount must be greater than 0';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason is required';
  end if;

  if not exists (
    select 1
    from public.biz_companies c
    where c.id = p_company_id
      and c.status = 'approved'
  ) then
    raise exception 'Approved company not found';
  end if;

  select coalesce(sum(l.amount), 0)::numeric(14,0)
    into v_current_balance
  from public.biz_balance_ledger l
  where l.company_id = p_company_id;

  v_signed_amount := case
    when v_adjustment_type = 'credit' then v_amount
    else -v_amount
  end;

  insert into public.biz_balance_ledger (
    company_id,
    amount,
    ledger_type,
    reason,
    memo,
    created_by
  )
  values (
    p_company_id,
    v_signed_amount,
    case
      when v_adjustment_type = 'credit' then 'manual_credit'
      else 'manual_debit'
    end,
    btrim(p_reason),
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
    p_company_id,
    v_admin_user_id,
    'biz_balance_ledger',
    v_ledger_id,
    case
      when v_adjustment_type = 'credit' then 'manual_credit'
      else 'manual_debit'
    end,
    jsonb_build_object(
      'current_balance_before', v_current_balance
    ),
    jsonb_build_object(
      'current_balance_after', (v_current_balance + v_signed_amount)::numeric(14,0),
      'amount', v_signed_amount,
      'ledger_id', v_ledger_id,
      'reason', btrim(p_reason)
    ),
    p_admin_memo
  );

  return query
  select
    p_company_id,
    v_adjustment_type,
    v_amount,
    v_signed_amount,
    v_current_balance,
    (v_current_balance + v_signed_amount)::numeric(14,0),
    v_ledger_id;
end;
$$;

comment on function public.create_manual_ledger_adjustment(uuid, text, numeric, text, text)
is 'Creates a manual credit or debit ledger adjustment and admin log in one transaction. Intended for admin users. Manual debit may create a negative company balance.';

revoke all on function public.create_manual_ledger_adjustment(uuid, text, numeric, text, text) from public;
revoke all on function public.create_manual_ledger_adjustment(uuid, text, numeric, text, text) from anon;
grant execute on function public.create_manual_ledger_adjustment(uuid, text, numeric, text, text) to authenticated;
