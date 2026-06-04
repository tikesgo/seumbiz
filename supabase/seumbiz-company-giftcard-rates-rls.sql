-- SEUMBiz company gift card rate overrides RLS
-- Run after supabase/seumbiz-company-giftcard-rates.sql and supabase/seumbiz-rls.sql helpers.
-- Admin-only access. Company users must not read override rates.

alter table public.biz_company_giftcard_rates enable row level security;

drop policy if exists "biz_company_giftcard_rates_admin_select" on public.biz_company_giftcard_rates;
create policy "biz_company_giftcard_rates_admin_select"
on public.biz_company_giftcard_rates
for select
to authenticated
using (public.is_biz_admin());

drop policy if exists "biz_company_giftcard_rates_admin_insert" on public.biz_company_giftcard_rates;
create policy "biz_company_giftcard_rates_admin_insert"
on public.biz_company_giftcard_rates
for insert
to authenticated
with check (public.is_biz_admin());

drop policy if exists "biz_company_giftcard_rates_admin_update" on public.biz_company_giftcard_rates;
create policy "biz_company_giftcard_rates_admin_update"
on public.biz_company_giftcard_rates
for update
to authenticated
using (public.is_biz_admin())
with check (public.is_biz_admin());

drop policy if exists "biz_company_giftcard_rates_admin_delete" on public.biz_company_giftcard_rates;
create policy "biz_company_giftcard_rates_admin_delete"
on public.biz_company_giftcard_rates
for delete
to authenticated
using (public.is_biz_admin());
