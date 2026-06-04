-- Deploy only: reject_purchase_request (Phase A)
-- Run in Supabase SQL Editor after review.

drop function if exists public.reject_purchase_request(uuid, text);

create or replace function public.reject_purchase_request(
  p_purchase_request_id uuid,
  p_admin_memo text
)
returns table (
  purchase_request_id uuid,
  receipt_no text,
  company_id uuid,
  status text,
  reviewed_by uuid,
  rejected_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_auth_user_id uuid := auth.uid();
  v_admin_user_id uuid;
  v_is_admin boolean := false;
  v_request public.biz_purchase_requests%rowtype;
  v_rejected_at timestamptz;
  v_admin_memo text;
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

  if p_purchase_request_id is null then
    raise exception 'purchase_request_id is required';
  end if;

  v_admin_memo := btrim(coalesce(p_admin_memo, ''));
  if v_admin_memo = '' then
    raise exception 'Reject reason is required';
  end if;

  select *
    into v_request
  from public.biz_purchase_requests pr
  where pr.id = p_purchase_request_id
  for update;

  if not found then
    raise exception 'Purchase request not found';
  end if;

  if v_request.status = 'approved' then
    raise exception 'Approved purchase request cannot be rejected';
  end if;

  if v_request.status = 'rejected' then
    raise exception 'Purchase request is already rejected';
  end if;

  if v_request.status = 'canceled' then
    raise exception 'Canceled purchase request cannot be rejected';
  end if;

  if v_request.status not in ('pending', 'reviewing') then
    raise exception 'Only pending or reviewing purchase requests can be rejected';
  end if;

  v_rejected_at := now();

  update public.biz_purchase_requests
  set
    status = 'rejected',
    admin_memo = v_admin_memo,
    reviewed_by = v_admin_user_id,
    reviewed_at = v_rejected_at,
    rejected_at = v_rejected_at,
    updated_at = v_rejected_at
  where id = p_purchase_request_id;

  update public.biz_purchase_items pi
  set
    status = 'rejected',
    updated_at = v_rejected_at
  where pi.purchase_request_id = p_purchase_request_id;

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
    v_request.company_id,
    v_admin_user_id,
    'biz_purchase_requests',
    v_request.id,
    'purchase_rejected',
    jsonb_build_object(
      'status', v_request.status,
      'expected_settlement_amount', v_request.expected_settlement_amount
    ),
    jsonb_build_object(
      'status', 'rejected',
      'expected_settlement_amount', v_request.expected_settlement_amount
    ),
    v_admin_memo
  );

  return query
  select
    v_request.id,
    v_request.receipt_no,
    v_request.company_id,
    'rejected'::text,
    v_admin_user_id,
    v_rejected_at;
end;
$$;

comment on function public.reject_purchase_request(uuid, text)
is 'Rejects a pending or reviewing purchase request without creating a balance ledger row. Intended for admin users.';

revoke all on function public.reject_purchase_request(uuid, text) from public;
revoke all on function public.reject_purchase_request(uuid, text) from anon;
grant execute on function public.reject_purchase_request(uuid, text) to authenticated;
