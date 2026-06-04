-- SEUMBiz create_purchase_request giftcard_code migration
-- Run after supabase/seumbiz-giftcard-types.sql and supabase/seumbiz-company-giftcard-rates.sql.
-- This replaces only public.create_purchase_request(text, jsonb, text).

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
    where x.face_value is null or x.face_value <= 0
  ) then
    raise exception 'Every item must include a positive face_value';
  end if;

  if v_total_face_value <= 0 then
    raise exception 'total_face_value must be greater than 0';
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
