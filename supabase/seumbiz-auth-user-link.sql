-- SeumBiz Auth user link migration
-- Review before running in Supabase SQL Editor.
-- Purpose: keep biz_users.id as the internal row id and link Supabase Auth through biz_users.auth_user_id.

alter table public.biz_users
  add column if not exists auth_user_id uuid;

create unique index if not exists uq_biz_users_auth_user_id
on public.biz_users (auth_user_id)
where auth_user_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'biz_users_auth_user_id_fkey'
      and conrelid = 'public.biz_users'::regclass
  ) then
    alter table public.biz_users
      add constraint biz_users_auth_user_id_fkey
      foreign key (auth_user_id)
      references auth.users(id)
      on delete set null;
  end if;
end $$;

alter table public.biz_users
  drop constraint if exists biz_users_role_check;

alter table public.biz_users
  add constraint biz_users_role_check
  check (role in ('company_user', 'company_staff', 'company_owner', 'admin'));

alter table public.biz_users
  drop constraint if exists biz_users_company_required_by_role;

alter table public.biz_users
  add constraint biz_users_company_required_by_role
  check (
    (role = 'admin' and company_id is null)
    or (role in ('company_user', 'company_staff', 'company_owner') and company_id is not null)
  );

create index if not exists idx_biz_users_auth_user_id
on public.biz_users(auth_user_id);

update public.biz_users
set auth_user_id = '94a89b30-95ce-4706-832e-bb8862c8c84a'
where login_id = 'test@test.com';

update public.biz_users
set auth_user_id = '08b1d6c7-5a95-4f26-8088-39d89c70b5ae'
where login_id = 'admin@test.com';

select id, auth_user_id, login_id, role, status, company_id
from public.biz_users
where login_id in ('test@test.com', 'admin@test.com')
order by login_id;
