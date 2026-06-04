-- SEUMBiz company-specific gift card rate overrides
-- Run after supabase/seumbiz-schema.sql (or seumbiz-giftcard-types.sql).
-- Override-only: rows exist only when admin sets a company-specific rate.
-- Fallback: biz_giftcard_types.default_rate
-- biz_companies.default_rate is reserved and not used here.

create table if not exists public.biz_company_giftcard_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id) on delete cascade,
  giftcard_type_id uuid not null references public.biz_giftcard_types(id) on delete cascade,
  rate numeric(5,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biz_company_giftcard_rates_unique_company_giftcard unique (company_id, giftcard_type_id),
  constraint biz_company_giftcard_rates_rate_range check (rate > 0 and rate <= 100)
);

create index if not exists idx_biz_company_giftcard_rates_company_id
on public.biz_company_giftcard_rates(company_id);

create index if not exists idx_biz_company_giftcard_rates_giftcard_type_id
on public.biz_company_giftcard_rates(giftcard_type_id);

drop trigger if exists set_biz_company_giftcard_rates_updated_at on public.biz_company_giftcard_rates;
create trigger set_biz_company_giftcard_rates_updated_at
before update on public.biz_company_giftcard_rates
for each row
execute function public.set_updated_at();

create or replace function public.resolve_company_giftcard_rate(
  p_company_id uuid,
  p_giftcard_type_id uuid,
  p_fallback_rate numeric default null
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select cgr.rate
      from public.biz_company_giftcard_rates cgr
      where cgr.company_id = p_company_id
        and cgr.giftcard_type_id = p_giftcard_type_id
      limit 1
    ),
    p_fallback_rate,
    (
      select gt.default_rate
      from public.biz_giftcard_types gt
      where gt.id = p_giftcard_type_id
      limit 1
    )
  );
$$;

comment on table public.biz_company_giftcard_rates is
'Company-specific gift card rate overrides. Missing row means use biz_giftcard_types.default_rate.';

comment on column public.biz_company_giftcard_rates.rate is
'Override rate for the company and gift card. Must be between 0 and 100 exclusive of 0.';

comment on function public.resolve_company_giftcard_rate(uuid, uuid, numeric) is
'Returns company override rate when present, otherwise fallback/global gift card default rate.';

revoke all on function public.resolve_company_giftcard_rate(uuid, uuid, numeric) from public;
revoke all on function public.resolve_company_giftcard_rate(uuid, uuid, numeric) from anon;
grant execute on function public.resolve_company_giftcard_rate(uuid, uuid, numeric) to authenticated;
