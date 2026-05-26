# ?몄?鍮꾩쫰 DB ?ㅺ퀎 珥덉븞

??臾몄꽌???몄?鍮꾩쫰 ?낆껜 ?꾩슜 湲곕뒫???꾪븳 ?곗씠?곕쿋?댁뒪 ?ㅺ퀎 珥덉븞?낅땲??
?꾨옒 SQL? ?섏쨷??Supabase?먯꽌 寃?????ㅽ뻾?섍린 ?꾪븳 珥덉븞?대ŉ, ?꾩옱 ?④퀎?먯꽌???ㅽ뻾?섏? ?딆뒿?덈떎.

## 1. ?듭떖 ?뚯씠釉??ㅺ퀎

### biz_companies

?낆껜 ?⑥쐞??湲곕낯 ?뺣낫瑜???ν빀?덈떎.

| 而щ읆 | ???| ?ㅻ챸 |
| --- | --- | --- |
| id | uuid | ?낆껜 怨좎쑀 ID |
| company_name | text | ?낆껜紐??먮뒗 ?곹샇 |
| business_registration_number | text | ?ъ뾽?먮벑濡앸쾲??|
| representative_name | text | ??쒖옄紐?|
| phone | text | ????곕씫泥?|
| email | text | ????대찓??|
| status | text | ?낆껜 ?곹깭 |
| memo | text | 愿由ъ옄 硫붾え |
| created_at | timestamptz | ?앹꽦??|
| updated_at | timestamptz | ?섏젙??|

### biz_users

?낆껜???뚯냽???ъ슜??怨꾩젙????ν빀?덈떎. Supabase Auth? ?곌껐??寃쎌슦 `auth_user_id`瑜?湲곗??쇰줈 留ㅽ븨?⑸땲??

| 而щ읆 | ???| ?ㅻ챸 |
| --- | --- | --- |
| id | uuid | ?ъ슜??怨좎쑀 ID |
| company_id | uuid | ?뚯냽 ?낆껜 ID |
| auth_user_id | uuid | Supabase Auth ?ъ슜??ID |
| name | text | ?대떦?먮챸 |
| phone | text | ?대떦???곕씫泥?|
| email | text | ?대떦???대찓??|
| role | text | 沅뚰븳 |
| status | text | ?ъ슜???곹깭 |
| created_at | timestamptz | ?앹꽦??|
| updated_at | timestamptz | ?섏젙??|

### biz_giftcard_submissions

?낆껜媛 ?깅줉???곹뭹沅??묒닔 嫄댁쓣 ??ν빀?덈떎.

| 而щ읆 | ???| ?ㅻ챸 |
| --- | --- | --- |
| id | uuid | ?깅줉 嫄?怨좎쑀 ID |
| company_id | uuid | ?낆껜 ID |
| user_id | uuid | ?깅줉 ?ъ슜??ID |
| giftcard_type | text | ?곹뭹沅?醫낅쪟 |
| serial_number | text | ?쇰젴踰덊샇 |
| face_value | numeric | ?〓㈃媛 |
| quantity | integer | ?섎웾 |
| total_face_value | numeric | ?〓㈃媛 ?⑷퀎 |
| approved_balance_amount | numeric | ?뱀씤 ???곷┰ ?ъ씤??|
| status | text | ?깅줉 ?곹깭 |
| reject_reason | text | 諛섎젮 ?ъ쑀 |
| memo | text | ?낆껜 硫붾え |
| admin_memo | text | 愿由ъ옄 硫붾え |
| reviewed_at | timestamptz | 寃?섏씪 |
| reviewed_by | uuid | 寃??愿由ъ옄 ID |
| created_at | timestamptz | ?앹꽦??|
| updated_at | timestamptz | ?섏젙??|

?곹뭹沅??깅줉 ?곹깭:

| ?곹깭 | ?섎? |
| --- | --- |
| ?뱀씤?湲?| ?낆껜媛 ?깅줉?덇퀬 愿由ъ옄 寃????|
| ?뱀씤?꾨즺 | 愿由ъ옄 寃???꾨즺, ?ъ씤???곷┰ ???|
| 諛섎젮 | 愿由ъ옄 寃??諛섎젮 |
| 痍⑥냼 | ?낆껜 ?먮뒗 愿由ъ옄???섑빐 痍⑥냼 |

### biz_balance_ledger

?ъ씤??蹂?숈쓽 紐⑤뱺 ?먮쫫??濡쒓렇濡???ν빀?덈떎.

| 而щ읆 | ???| ?ㅻ챸 |
| --- | --- | --- |
| id | uuid | 濡쒓렇 怨좎쑀 ID |
| company_id | uuid | ?낆껜 ID |
| user_id | uuid | 愿???ъ슜??ID |
| source_type | text | 諛쒖깮 異쒖쿂 |
| source_id | uuid | 諛쒖깮 異쒖쿂 ID |
| entry_type | text | ?곷┰, 李④컧, 痍⑥냼, ?뺤궛 |
| amount | numeric | ?ъ씤??利앷컧媛?|
| balance_after | numeric | 湲곕줉 ?쒖젏 李멸퀬 ?붿븸 |
| memo | text | ?ㅻ챸 |
| created_at | timestamptz | ?앹꽦??|

?ъ씤??濡쒓렇 ???

| ???| 湲덉븸 諛⑺뼢 | ?섎? |
| --- | --- | --- |
| ?곷┰ | ?묒닔 | ?곹뭹沅??뱀씤 ???ъ씤??利앷? |
| 李④컧 | ?뚯닔 | ?뺤궛 ?좎껌 ?깆쑝濡??ъ씤??媛먯냼 |
| 痍⑥냼 | ?묒닔 ?먮뒗 ?뚯닔 | ?댁쟾 濡쒓렇瑜??섎룎由ш굅??蹂댁젙 |
| ?뺤궛 | ?뚯닔 | ?뺤궛 泥섎━???곕Ⅸ ?ъ씤???ъ슜 |

### biz_settlement_logs

?낆껜???뺤궛 ?좎껌怨?泥섎━ ?곹깭瑜???ν빀?덈떎.

| 而щ읆 | ???| ?ㅻ챸 |
| --- | --- | --- |
| id | uuid | ?뺤궛 ?좎껌 怨좎쑀 ID |
| company_id | uuid | ?낆껜 ID |
| user_id | uuid | ?좎껌 ?ъ슜??ID |
| requested_amount | numeric | ?좎껌 湲덉븸 |
| bank_name | text | ??됰챸 |
| account_number | text | 怨꾩쥖踰덊샇 |
| account_holder | text | ?덇툑二?|
| status | text | ?뺤궛 ?곹깭 |
| reject_reason | text | 諛섎젮 ?ъ쑀 |
| admin_memo | text | 愿由ъ옄 硫붾え |
| requested_at | timestamptz | ?좎껌??|
| processed_at | timestamptz | 泥섎━??|
| processed_by | uuid | 泥섎━ 愿由ъ옄 ID |
| created_at | timestamptz | ?앹꽦??|
| updated_at | timestamptz | ?섏젙??|

?뺤궛 ?곹깭:

| ?곹깭 | ?섎? |
| --- | --- |
| ?뺤궛?湲?| ?낆껜媛 ?뺤궛 ?좎껌?덇퀬 愿由ъ옄 ?뺤씤 ??|
| ?뺤궛以?| 愿由ъ옄 ?뺤씤 ??泥섎━ 以?|
| ?뺤궛?꾨즺 | ?뺤궛 泥섎━ ?꾨즺 |
| 諛섎젮 | ?뺤궛 ?좎껌 諛섎젮 |
| 痍⑥냼 | ?낆껜 ?먮뒗 愿由ъ옄???섑빐 痍⑥냼 |

## 2. ?ъ씤???먯튃

- ?ъ씤?몃뒗 ?붿븸 而щ읆 ?섎굹留?誘우? ?딆뒿?덈떎.
- ?낆껜蹂??ㅼ젣 蹂댁쑀 ?ъ씤?몃뒗 `biz_balance_ledger`??濡쒓렇 ?⑷퀎濡?怨꾩궛?⑸땲??
- ?곷┰, 李④컧, 痍⑥냼, ?뺤궛 ??紐⑤뱺 ?ъ씤???먮쫫??`biz_balance_ledger`??湲곕줉?⑸땲??
- `balance_after`???붾㈃ ?쒖떆? 媛먯궗 異붿쟻???꾪븳 李멸퀬媛믪쑝濡쒕쭔 ?ъ슜?섍퀬, 理쒖쥌 吏꾩떎媛믪? 濡쒓렇 ?⑷퀎?낅땲??
- ?곹뭹沅??뱀씤?꾨즺 ???곷┰ 濡쒓렇瑜??④린怨? 諛섎젮??痍⑥냼 ?쒖뿉???꾩슂??寃쎌슦 痍⑥냼 濡쒓렇瑜??④퉩?덈떎.
- ?뺤궛 ?좎껌 ???ъ씤?몃? 利됱떆 李④컧?좎?, ?뺤궛?꾨즺 ??李④컧?좎????댁쁺 ?뺤콉?쇰줈 ?뺤젙?댁빞 ?⑸땲??
- 以묐났 ?곷┰怨?以묐났 李④컧??留됯린 ?꾪빐 `source_type`, `source_id`, `entry_type` 議고빀???좊땲???뺤콉??寃?좏빀?덈떎.

## 3. ?곹깭媛??ㅺ퀎

### ?곹뭹沅??깅줉 ?곹깭

- ?뱀씤?湲?- ?뱀씤?꾨즺
- 諛섎젮
- 痍⑥냼

### ?뺤궛 ?곹깭

- ?뺤궛?湲?- ?뺤궛以?- ?뺤궛?꾨즺
- 諛섎젮
- 痍⑥냼

## 4. Supabase SQL 珥덉븞

二쇱쓽: ?꾨옒 SQL? 珥덉븞?낅땲?? ?꾩쭅 Supabase???ㅽ뻾?섏? ?딆뒿?덈떎.

```sql
create table if not exists public.biz_companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  business_registration_number text,
  representative_name text,
  phone text,
  email text,
  status text not null default '?쒖꽦',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.biz_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id),
  auth_user_id uuid,
  name text not null,
  phone text,
  email text,
  role text not null default '?대떦??,
  status text not null default '?쒖꽦',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.biz_giftcard_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id),
  user_id uuid references public.biz_users(id),
  giftcard_type text not null,
  serial_number text,
  face_value numeric not null default 0,
  quantity integer not null default 1,
  total_face_value numeric not null default 0,
  approved_balance_amount numeric not null default 0,
  status text not null default '?뱀씤?湲?,
  reject_reason text,
  memo text,
  admin_memo text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biz_giftcard_submissions_status_check
    check (status in ('?뱀씤?湲?, '?뱀씤?꾨즺', '諛섎젮', '痍⑥냼')),
  constraint biz_giftcard_submissions_quantity_check
    check (quantity > 0),
  constraint biz_giftcard_submissions_face_value_check
    check (face_value >= 0),
  constraint biz_giftcard_submissions_total_face_value_check
    check (total_face_value >= 0),
  constraint biz_giftcard_submissions_approved_balance_amount_check
    check (approved_balance_amount >= 0)
);

create table if not exists public.biz_balance_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id),
  user_id uuid references public.biz_users(id),
  source_type text not null,
  source_id uuid,
  entry_type text not null,
  amount numeric not null,
  balance_after numeric,
  memo text,
  created_at timestamptz not null default now(),
  constraint biz_balance_ledger_entry_type_check
    check (entry_type in ('?곷┰', '李④컧', '痍⑥냼', '?뺤궛'))
);

create table if not exists public.biz_settlement_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id),
  user_id uuid references public.biz_users(id),
  requested_amount numeric not null,
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  status text not null default '?뺤궛?湲?,
  reject_reason text,
  admin_memo text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biz_settlement_logs_status_check
    check (status in ('?뺤궛?湲?, '?뺤궛以?, '?뺤궛?꾨즺', '諛섎젮', '痍⑥냼')),
  constraint biz_settlement_logs_requested_amount_check
    check (requested_amount > 0)
);

create index if not exists biz_users_company_id_idx
  on public.biz_users(company_id);

create index if not exists biz_giftcard_submissions_company_id_idx
  on public.biz_giftcard_submissions(company_id);

create index if not exists biz_giftcard_submissions_status_idx
  on public.biz_giftcard_submissions(status);

create index if not exists biz_balance_ledger_company_id_created_at_idx
  on public.biz_balance_ledger(company_id, created_at desc);

create index if not exists biz_balance_ledger_source_idx
  on public.biz_balance_ledger(source_type, source_id);

create index if not exists biz_settlement_logs_company_id_idx
  on public.biz_settlement_logs(company_id);

create index if not exists biz_settlement_logs_status_idx
  on public.biz_settlement_logs(status);
```

## 5. ?꾩냽 寃????ぉ

- Supabase Auth ?ъ슜?먯? `biz_users.auth_user_id` ?곌껐 諛⑹떇
- 愿由ъ옄 怨꾩젙 ?뚯씠釉??먮뒗 湲곗〈 愿由ъ옄 援ъ“????곌껐 諛⑹떇
- RLS ?뺤콉 踰붿쐞
- ?뺤궛 ?좎껌 ?쒖젏???ъ씤??李④컧 ?뺤콉
- ?곹뭹沅??쇰젴踰덊샇 以묐났 寃???뺤콉
- `updated_at` ?먮룞 媛깆떊 ?몃━嫄??곸슜 ?щ?


