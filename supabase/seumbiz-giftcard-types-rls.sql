-- SEUMBiz giftcard type RLS policy
-- Run this if 업체 매입신청 화면 cannot select biz_giftcard_types while admin service role can.

alter table public.biz_giftcard_types enable row level security;

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
