# 세움비즈 DB 설계 초안

이 문서는 세움비즈 업체 전용 운영 포털을 위한 데이터베이스 설계 초안입니다.
세움비즈는 광고형 랜딩페이지가 아니라, 업체가 로그인 후 매입 신청과 잔액 관리를 처리하는 B2B 운영 포털을 목표로 합니다.

주의: 아래 SQL은 나중에 Supabase에서 검토 후 실행하기 위한 초안입니다. 현재 단계에서는 실행하지 않습니다.

## 1. 핵심 테이블 설계

### biz_companies

업체 단위의 기본 정보를 저장합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 업체 고유 ID |
| company_name | text | 업체명 또는 상호 |
| business_registration_number | text | 사업자등록번호 |
| representative_name | text | 대표자명 |
| phone | text | 대표 연락처 |
| email | text | 대표 이메일 |
| status | text | 업체 상태 |
| memo | text | 관리자 메모 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

업체 상태:

- 정상
- 승인대기
- 정지
- 탈퇴

### biz_users

업체에 소속된 사용자 계정을 저장합니다. Supabase Auth 사용자는 `auth_user_id`로 연결하고, `id`는 내부 FK용 사용자 ID로 유지합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 사용자 고유 ID |
| company_id | uuid | 소속 업체 ID |
| auth_user_id | uuid | Supabase Auth 사용자 ID |
| login_id | text | 업체 로그인 아이디 |
| name | text | 담당자명 |
| phone | text | 담당자 연락처 |
| email | text | 담당자 이메일 |
| role | text | 권한 |
| status | text | 사용자 상태 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

### biz_giftcard_submissions

업체가 등록한 상품권 매입 신청 건을 저장합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 매입 신청 고유 ID |
| company_id | uuid | 업체 ID |
| user_id | uuid | 신청 사용자 ID |
| giftcard_type | text | 상품권 종류 |
| input_method | text | 입력 방식 |
| pin_raw_text | text | 업체가 입력하거나 붙여넣은 원문 |
| extracted_pin_text | text | 이미지 분석으로 추출한 핀번호 후보 |
| confirmed_pin_text | text | 업체가 확인/수정 후 최종 등록한 핀번호 |
| image_url | text | 업로드 이미지 경로 |
| face_value | numeric | 액면가 |
| quantity | integer | 수량 |
| total_face_value | numeric | 액면가 합계 |
| approved_balance_amount | numeric | 승인 후 업체 잔액 반영 금액 |
| status | text | 매입 신청 상태 |
| reject_reason | text | 반려 사유 |
| memo | text | 업체 메모 |
| admin_memo | text | 관리자 메모 |
| reviewed_at | timestamptz | 검수일 |
| reviewed_by | uuid | 검수 관리자 ID |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

매입 신청 상태:

- 승인대기
- 승인완료
- 반려
- 취소

### biz_balance_ledger

업체 잔액 변동의 모든 흐름을 로그로 저장합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 로그 고유 ID |
| company_id | uuid | 업체 ID |
| user_id | uuid | 관련 사용자 ID |
| source_type | text | 발생 출처 |
| source_id | uuid | 발생 출처 ID |
| entry_type | text | 반영, 차감, 취소, 조정 |
| amount | numeric | 업체 잔액 증감값 |
| balance_after | numeric | 기록 시점 참고 잔액 |
| memo | text | 설명 |
| created_at | timestamptz | 생성일 |

업체 잔액 로그 타입:

| 타입 | 금액 방향 | 의미 |
| --- | --- | --- |
| 반영 | 양수 | 상품권 승인 후 업체 잔액 증가 |
| 차감 | 음수 | 출금 지급승인 후 업체 잔액 감소 |
| 취소 | 양수 또는 음수 | 이전 로그를 되돌리거나 보정 |
| 조정 | 양수 또는 음수 | 관리자 수동 조정 |

### biz_withdraw_requests

업체의 업체 잔액 출금 신청과 처리 상태를 저장합니다.
사이트 안에는 업체 계좌번호를 저장하지 않습니다. 계좌 정보는 카카오톡 상담으로 전달받고 운영자가 수동 이체합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 출금 신청 고유 ID |
| company_id | uuid | 업체 ID |
| user_id | uuid | 신청 사용자 ID |
| requested_amount | numeric | 출금 신청 금액 |
| status | text | 출금 상태 |
| kakao_contact_required | boolean | 카카오톡 계좌 전달 필요 여부 |
| reject_reason | text | 반려 사유 |
| cancel_reason | text | 취소 사유 |
| admin_memo | text | 관리자 메모 |
| requested_at | timestamptz | 신청일 |
| processing_started_at | timestamptz | 지급진행중 변경일 |
| approved_at | timestamptz | 지급승인일 |
| approved_by | uuid | 지급승인 관리자 ID |
| completed_at | timestamptz | 지급완료일 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

출금 상태:

- 출금대기
- 지급진행중
- 지급완료
- 반려
- 취소

## 2. 업체 잔액 원칙

- 업체 잔액은 단일 잔액 컬럼만 믿지 않습니다.
- 업체별 실제 보유 잔액은 `biz_balance_ledger`의 로그 합계로 계산합니다.
- 매입 승인, 관리자 조정, 출금 지급승인 등 모든 잔액 변동은 `biz_balance_ledger`에 기록합니다.
- `balance_after`는 화면 표시와 감사 추적을 위한 참고값으로만 사용하고, 최종 기준은 로그 합계입니다.
- 매입 신청이 승인완료되면 업체 잔액 반영 로그를 남깁니다.
- 출금 신청만으로는 업체 잔액을 차감하지 않습니다.
- 출금 신청만으로는 `biz_balance_ledger` 차감 로그를 만들지 않습니다.
- 잔액 차감 로그는 관리자 지급승인 시점에만 생성합니다.
- 반려 또는 취소 상태가 되면 업체 잔액 차감은 없습니다.
- 중복 반영과 중복 차감을 막기 위해 `source_type`, `source_id`, `entry_type` 조합의 유니크 정책을 검토합니다.

## 3. 업체 잔액 출금 플로우

1. 업체가 사이트에서 업체 잔액 출금 신청을 합니다.
2. 신청 상태는 `출금대기`가 됩니다.
3. 출금 신청 시점에는 업체 잔액을 차감하지 않습니다.
4. 사이트 안에는 업체 계좌번호를 저장하지 않습니다.
5. 업체는 카카오톡에서 계좌 정보를 전달합니다.
6. 운영자가 카카오톡에서 계좌를 확인하고 수동 이체를 준비합니다.
7. 관리자 페이지에서 지급승인 버튼을 클릭합니다.
8. 관리자 지급승인 시점에 업체 잔액을 차감합니다.
9. 상태는 `지급완료`로 변경합니다.
10. 지급완료 시 `biz_balance_ledger`에 차감 로그를 기록합니다.
11. 반려 또는 취소 시 업체 잔액 차감과 차감 로그는 없습니다.

## 4. 보안/운영 원칙

- 사이트에 계좌정보를 저장하지 않습니다.
- 자동 송금 기능은 만들지 않습니다.
- 실제 이체는 운영자가 수동 처리합니다.
- 관리자는 지급승인, 반려, 취소, 메모를 관리합니다.
- 모든 업체 잔액 변동은 `biz_balance_ledger` 로그로 남깁니다.
- 출금 신청은 운영 요청 기록일 뿐이며, 잔액 변동 기록이 아닙니다.
- 잔액 차감 로그는 관리자 지급승인 시점에만 생성합니다.

## 5. Supabase SQL 초안

주의: 아래 SQL은 초안입니다. 아직 Supabase에 실행하지 않습니다.

```sql
create table if not exists public.biz_companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  business_registration_number text,
  representative_name text,
  phone text,
  email text,
  status text not null default '승인대기',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biz_companies_status_check
    check (status in ('정상', '승인대기', '정지', '탈퇴'))
);

create table if not exists public.biz_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id),
  auth_user_id uuid,
  login_id text,
  name text not null,
  phone text,
  email text,
  role text not null default '업체',
  status text not null default '정상',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.biz_giftcard_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id),
  user_id uuid references public.biz_users(id),
  giftcard_type text not null,
  input_method text,
  pin_raw_text text,
  extracted_pin_text text,
  confirmed_pin_text text,
  image_url text,
  face_value numeric not null default 0,
  quantity integer not null default 1,
  total_face_value numeric not null default 0,
  approved_balance_amount numeric not null default 0,
  status text not null default '승인대기',
  reject_reason text,
  memo text,
  admin_memo text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biz_giftcard_submissions_status_check
    check (status in ('승인대기', '승인완료', '반려', '취소')),
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
    check (entry_type in ('반영', '차감', '취소', '조정'))
);

create table if not exists public.biz_withdraw_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.biz_companies(id),
  user_id uuid references public.biz_users(id),
  requested_amount numeric not null,
  status text not null default '출금대기',
  kakao_contact_required boolean not null default true,
  reject_reason text,
  cancel_reason text,
  admin_memo text,
  requested_at timestamptz not null default now(),
  processing_started_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biz_withdraw_requests_status_check
    check (status in ('출금대기', '지급진행중', '지급완료', '반려', '취소')),
  constraint biz_withdraw_requests_requested_amount_check
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

create index if not exists biz_withdraw_requests_company_id_idx
  on public.biz_withdraw_requests(company_id);

create index if not exists biz_withdraw_requests_status_idx
  on public.biz_withdraw_requests(status);
```

## 6. 후속 검토 항목

- `biz_withdraw_requests` 이름 확정 여부
- 관리자 지급승인 버튼과 잔액 차감 로그 생성의 트랜잭션 처리 방식
- 이미지 업로드 파일 보관 위치와 보관 기간
- OCR 또는 이미지 분석 결과의 저장 범위
- 상품권별 핀번호 패턴 관리 방식
- RLS 정책 범위
- 관리자 감사 로그 테이블 분리 여부
