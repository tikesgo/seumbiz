-- SeumBiz RPC draft
-- Review before running in Supabase SQL Editor.
-- This file depends on supabase/seumbiz-schema.sql and supabase/seumbiz-rls.sql.

drop function if exists public.create_purchase_request(text, jsonb, text);

create or replace function public.create_purchase_request(
  p_giftcard_code text,
  p_items jsonb,
  p_submitted_memo text default null
)
returns table (
  purchase_request_id uuid,
  receipt_no text,
  item_count integer,
  total_face_value numeric,
  applied_rate numeric,
  expected_settlement_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid;
  v_company_id uuid;
  v_giftcard public.biz_giftcard_types%rowtype;
  v_receipt_no text;
  v_today text := to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD');
  v_next_no integer;
  v_request_id uuid;
  v_item_count integer;
  v_total_face_value numeric(14,0);
  v_applied_rate numeric(5,2);
  v_expected_settlement_amount numeric(14,0);
begin
  if v_auth_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_giftcard_code is null or btrim(p_giftcard_code) = '' then
    raise exception 'giftcard_code is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty json array';
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

  select *
    into v_giftcard
  from public.biz_giftcard_types gt
  where gt.code = upper(btrim(p_giftcard_code))
    and gt.is_visible = true
    and gt.is_active = true
  limit 1;

  if v_giftcard.id is null then
    raise exception '등록 가능한 상품권이 아닙니다.';
  end if;

  v_applied_rate := public.resolve_company_giftcard_rate(
    v_company_id,
    v_giftcard.id,
    v_giftcard.default_rate
  );

  if v_applied_rate is null or v_applied_rate <= 0 then
    raise exception 'Applicable gift card rate not found';
  end if;

  select count(*), coalesce(sum(face_value), 0)
    into v_item_count, v_total_face_value
  from (
    select
      btrim(x.pin_no) as pin_no,
      x.face_value::numeric(14,0) as face_value
    from jsonb_to_recordset(p_items) as x(
      pin_no text,
      face_value numeric,
      ocr_source text,
      ocr_confidence numeric
    )
  ) item_rows
  where item_rows.pin_no is not null
    and item_rows.pin_no <> '';

  if v_item_count <= 0 or v_item_count <> jsonb_array_length(p_items) then
    raise exception 'Every item must include pin_no';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(
      pin_no text,
      face_value numeric,
      ocr_source text,
      ocr_confidence numeric
    )
    where (x.ocr_source is distinct from 'ocr' and (x.face_value is null or x.face_value <= 0))
      or (x.face_value is not null and x.face_value <= 0)
  ) then
    raise exception 'Every non-OCR item must include a positive face_value';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(
      pin_no text,
      face_value numeric,
      ocr_source text,
      ocr_confidence numeric
    )
    where x.ocr_confidence is not null
      and (x.ocr_confidence < 0 or x.ocr_confidence > 100)
  ) then
    raise exception 'ocr_confidence must be between 0 and 100';
  end if;

  v_expected_settlement_amount := floor(v_total_face_value * v_applied_rate / 100);

  perform pg_advisory_xact_lock(hashtext('seumbiz_purchase_receipt_' || v_today));

  select coalesce(max(right(pr.receipt_no, 4)::integer), 0) + 1
    into v_next_no
  from public.biz_purchase_requests pr
  where pr.receipt_no like 'BIZ-' || v_today || '-%';

  v_receipt_no := 'BIZ-' || v_today || '-' || lpad(v_next_no::text, 4, '0');

  insert into public.biz_purchase_requests (
    company_id,
    requested_by,
    receipt_no,
    giftcard_type,
    giftcard_code,
    giftcard_name_snapshot,
    giftcard_logo_url_snapshot,
    giftcard_rate_snapshot,
    item_count,
    total_face_value,
    applied_rate,
    expected_settlement_amount,
    status,
    submitted_memo
  )
  values (
    v_company_id,
    v_user_id,
    v_receipt_no,
    v_giftcard.name,
    v_giftcard.code,
    v_giftcard.name,
    v_giftcard.logo_url,
    v_applied_rate,
    v_item_count,
    v_total_face_value,
    v_applied_rate,
    v_expected_settlement_amount,
    'pending',
    p_submitted_memo
  )
  returning id into v_request_id;

  insert into public.biz_purchase_items (
    purchase_request_id,
    company_id,
    giftcard_type,
    pin_no,
    face_value,
    ocr_source,
    ocr_confidence,
    status
  )
  select
    v_request_id,
    v_company_id,
    v_giftcard.name,
    btrim(x.pin_no),
    x.face_value::numeric(14,0),
    x.ocr_source,
    x.ocr_confidence::numeric(5,2),
    'pending'
  from jsonb_to_recordset(p_items) as x(
    pin_no text,
    face_value numeric,
    ocr_source text,
    ocr_confidence numeric
  );

  return query
  select
    v_request_id,
    v_receipt_no,
    v_item_count,
    v_total_face_value,
    v_applied_rate,
    v_expected_settlement_amount;
end;
$$;

comment on function public.create_purchase_request(text, jsonb, text)
is 'Creates a purchase request from a giftcard code and snapshots the effective company/gift card rate at request time. Intended for approved company users.';

revoke all on function public.create_purchase_request(text, jsonb, text) from public;
revoke all on function public.create_purchase_request(text, jsonb, text) from anon;
grant execute on function public.create_purchase_request(text, jsonb, text) to authenticated;

drop function if exists public.approve_purchase_request(uuid, numeric, text);
drop function if exists public.approve_purchase_request(uuid, numeric, text, jsonb);

create or replace function public.approve_purchase_request(
  p_purchase_request_id uuid,
  p_approved_settlement_amount numeric default null,
  p_admin_memo text default null,
  p_item_face_values jsonb default null
)
returns table (
  purchase_request_id uuid,
  receipt_no text,
  approved_settlement_amount numeric,
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
  v_request public.biz_purchase_requests%rowtype;
  v_approved_amount numeric(14,0);
  v_total_face_value numeric(14,0);
  v_expected_settlement_amount numeric(14,0);
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

  if p_purchase_request_id is null then
    raise exception 'purchase_request_id is required';
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
    raise exception 'Purchase request is already approved';
  end if;

  if v_request.status not in ('pending', 'reviewing') then
    raise exception 'Only pending or reviewing purchase requests can be approved';
  end if;

  if p_item_face_values is not null then
    if jsonb_typeof(p_item_face_values) <> 'array' then
      raise exception 'item_face_values must be an array';
    end if;

    update public.biz_purchase_items pi
    set
      face_value = x.face_value::numeric(14,0),
      updated_at = now()
    from jsonb_to_recordset(p_item_face_values) as x(
      id uuid,
      face_value numeric
    )
    where pi.id = x.id
      and pi.purchase_request_id = p_purchase_request_id;

    if exists (
      select 1
      from jsonb_to_recordset(p_item_face_values) as x(
        id uuid,
        face_value numeric
      )
      left join public.biz_purchase_items pi
        on pi.id = x.id
       and pi.purchase_request_id = p_purchase_request_id
      where pi.id is null
         or x.face_value is null
         or x.face_value <= 0
    ) then
      raise exception 'Every purchase item must include a positive face_value before approval';
    end if;
  end if;

  if exists (
    select 1
    from public.biz_purchase_items pi
    where pi.purchase_request_id = p_purchase_request_id
      and (pi.face_value is null or pi.face_value <= 0)
  ) then
    raise exception 'Every purchase item must include a positive face_value before approval';
  end if;

  select coalesce(sum(pi.face_value), 0)::numeric(14,0)
    into v_total_face_value
  from public.biz_purchase_items pi
  where pi.purchase_request_id = p_purchase_request_id;

  v_expected_settlement_amount := floor(v_total_face_value * coalesce(v_request.giftcard_rate_snapshot, v_request.applied_rate) / 100);
  v_approved_amount := coalesce(
    p_approved_settlement_amount::numeric(14,0),
    v_expected_settlement_amount::numeric(14,0)
  );

  if v_total_face_value <= 0 then
    raise exception 'total_face_value must be greater than 0';
  end if;

  if v_approved_amount <= 0 then
    raise exception 'approved_settlement_amount must be greater than 0';
  end if;

  update public.biz_purchase_requests
  set
    status = 'approved',
    total_face_value = v_total_face_value,
    expected_settlement_amount = v_expected_settlement_amount,
    approved_settlement_amount = v_approved_amount,
    admin_memo = p_admin_memo,
    reviewed_by = v_admin_user_id,
    reviewed_at = now(),
    approved_at = now(),
    updated_at = now()
  where id = p_purchase_request_id;

  insert into public.biz_balance_ledger (
    company_id,
    purchase_request_id,
    amount,
    ledger_type,
    reason,
    memo,
    created_by
  )
  values (
    v_request.company_id,
    v_request.id,
    v_approved_amount,
    'purchase_approved',
    'Purchase approved',
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
    v_request.company_id,
    v_admin_user_id,
    'biz_purchase_requests',
    v_request.id,
    'purchase_approved',
    jsonb_build_object(
      'status', v_request.status,
      'approved_settlement_amount', v_request.approved_settlement_amount
    ),
    jsonb_build_object(
      'status', 'approved',
      'total_face_value', v_total_face_value,
      'expected_settlement_amount', v_expected_settlement_amount,
      'approved_settlement_amount', v_approved_amount,
      'ledger_id', v_ledger_id
    ),
    p_admin_memo
  );

  return query
  select
    v_request.id,
    v_request.receipt_no,
    v_approved_amount,
    v_ledger_id;
end;
$$;

comment on function public.approve_purchase_request(uuid, numeric, text, jsonb)
is 'Approves a purchase request and creates a purchase_approved balance ledger row in one transaction. Intended for admin users.';

revoke all on function public.approve_purchase_request(uuid, numeric, text, jsonb) from public;
revoke all on function public.approve_purchase_request(uuid, numeric, text, jsonb) from anon;
grant execute on function public.approve_purchase_request(uuid, numeric, text, jsonb) to authenticated;

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

create or replace function public.reject_withdraw_request(
  p_withdraw_request_id uuid,
  p_admin_memo text default null
)
returns table (
  withdraw_request_id uuid,
  company_id uuid,
  amount numeric,
  status text,
  processed_by uuid,
  processed_at timestamptz
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
  v_processed_at timestamptz;
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
    raise exception 'Completed withdraw request cannot be rejected';
  end if;

  if v_withdraw.status = 'rejected' then
    raise exception 'Withdraw request is already rejected';
  end if;

  if v_withdraw.status not in ('pending') then
    raise exception 'Only pending withdraw requests can be rejected';
  end if;

  v_processed_at := now();

  update public.biz_withdraw_requests
  set
    status = 'rejected',
    admin_memo = p_admin_memo,
    processed_by = v_admin_user_id,
    processed_at = v_processed_at,
    updated_at = v_processed_at
  where id = p_withdraw_request_id;

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
    'withdraw_rejected',
    jsonb_build_object(
      'status', v_withdraw.status,
      'amount', v_withdraw.amount
    ),
    jsonb_build_object(
      'status', 'rejected',
      'amount', v_withdraw.amount
    ),
    p_admin_memo
  );

  return query
  select
    v_withdraw.id,
    v_withdraw.company_id,
    v_withdraw.amount,
    'rejected'::text,
    v_admin_user_id,
    v_processed_at;
end;
$$;

comment on function public.reject_withdraw_request(uuid, text)
is 'Rejects a pending withdraw request without changing the balance ledger. Intended for admin users.';

revoke all on function public.reject_withdraw_request(uuid, text) from public;
revoke all on function public.reject_withdraw_request(uuid, text) from anon;
grant execute on function public.reject_withdraw_request(uuid, text) to authenticated;

-- Required for manual ledger adjustment RPC.
-- Existing early schema drafts allowed manual_adjust only, so this block allows
-- manual_credit/manual_debit without touching existing ledger rows.
alter table public.biz_balance_ledger
  drop constraint if exists biz_balance_ledger_ledger_type_check;

alter table public.biz_balance_ledger
  add constraint biz_balance_ledger_ledger_type_check
  check (
    ledger_type in (
      'purchase_approved',
      'withdraw_completed',
      'admin_deduct',
      'admin_advance',
      'admin_restore',
      'manual_adjust',
      'manual_credit',
      'manual_debit'
    )
  );

alter table public.biz_balance_ledger
  drop constraint if exists biz_balance_ledger_manual_credit_positive;

alter table public.biz_balance_ledger
  add constraint biz_balance_ledger_manual_credit_positive
  check (ledger_type <> 'manual_credit' or amount > 0);

alter table public.biz_balance_ledger
  drop constraint if exists biz_balance_ledger_manual_debit_negative;

alter table public.biz_balance_ledger
  add constraint biz_balance_ledger_manual_debit_negative
  check (ledger_type <> 'manual_debit' or amount < 0);

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
