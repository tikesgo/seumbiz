-- Audit queries: run in Supabase SQL Editor BEFORE/AFTER deploy-20260606-restore-withdraw-policy.sql
-- Review results before rejecting legacy pending rows manually.

-- 1) Existing prepaid_settlement ledger rows (keep, do not delete)
select count(*) as prepaid_rows,
       coalesce(sum(amount), 0) as prepaid_total
from public.biz_balance_ledger
where ledger_type = 'prepaid_settlement';

select id, company_id, amount, reason, memo, created_at
from public.biz_balance_ledger
where ledger_type = 'prepaid_settlement'
order by created_at desc
limit 20;

-- 2) Pending withdraw requests on companies with negative balance (legacy — review then reject manually)
select wr.id,
       wr.company_id,
       c.company_name,
       wr.amount,
       wr.status,
       wr.created_at,
       coalesce(bal.balance_amount, 0) as current_balance
from public.biz_withdraw_requests wr
join public.biz_companies c on c.id = wr.company_id
left join public.biz_company_balances bal on bal.company_id = wr.company_id
where wr.status = 'pending'
  and coalesce(bal.balance_amount, 0) < 0
order by wr.created_at desc;

-- 3) Pending withdraw requests where amount exceeds current balance (legacy — review then reject manually)
select wr.id,
       wr.company_id,
       c.company_name,
       wr.amount,
       wr.status,
       wr.created_at,
       coalesce(bal.balance_amount, 0) as current_balance
from public.biz_withdraw_requests wr
join public.biz_companies c on c.id = wr.company_id
left join public.biz_company_balances bal on bal.company_id = wr.company_id
where wr.status = 'pending'
  and coalesce(bal.balance_amount, 0) >= 0
  and wr.amount > coalesce(bal.balance_amount, 0)
order by wr.created_at desc;

-- 4) Pending withdraw totals per company (for available amount sanity check)
select wr.company_id,
       c.company_name,
       coalesce(bal.balance_amount, 0) as current_balance,
       count(*) as pending_count,
       coalesce(sum(wr.amount), 0) as pending_total,
       coalesce(bal.balance_amount, 0) - coalesce(sum(wr.amount), 0) as available_after_pending
from public.biz_withdraw_requests wr
join public.biz_companies c on c.id = wr.company_id
left join public.biz_company_balances bal on bal.company_id = wr.company_id
where wr.status = 'pending'
group by wr.company_id, c.company_name, bal.balance_amount
order by available_after_pending asc;
