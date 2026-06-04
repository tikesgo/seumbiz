# 세움Biz RLS 설계 초안

이 문서는 세움Biz Supabase Row Level Security 설계 초안입니다. 현재 단계에서는 `supabase/seumbiz-rls.sql` 파일만 작성하며, Supabase SQL Editor에는 아직 실행하지 않습니다.

## 기본 전제

- Supabase Auth 사용자는 `biz_users.auth_user_id = auth.uid()`로 연결됩니다.
- `biz_users.id`는 기존 내부 row ID로 유지하며 FK 컬럼에서 사용합니다.
- 로그인 사용자의 업체 정보는 `biz_users.company_id`로 판단합니다.
- 로그인 사용자의 권한은 `biz_users.role`로 판단합니다.
- `biz_users.status = 'approved'`인 사용자만 유효 사용자로 취급합니다.
- `admin`은 전체 업체 데이터에 접근할 수 있습니다.
- `company_owner`, `company_staff`, `company_user`는 자기 `company_id` 데이터만 접근할 수 있습니다.
- RLS는 최후 방어선입니다.
- 실제 비즈니스 로직은 서버 API 또는 Supabase RPC transaction에서 처리합니다.
- 매입 신청, 출금 신청, 승인, 반려, 원장 생성은 직접 테이블 조작보다 RPC 중심으로 처리합니다.

## Helper 함수

### public.current_biz_user()

제거했습니다.

이유:

- `biz_users` 전체 row를 반환하면 `password_hash`, `phone` 같은 민감 컬럼이 노출될 위험이 있습니다.
- 현재 RLS 정책은 `current_biz_company_id()`, `is_biz_admin()`만으로 충분합니다.
- 향후 현재 사용자 정보가 필요하면 `id`, `company_id`, `role`, `status`처럼 안전한 필드만 반환하는 별도 safe 함수 또는 view를 검토합니다.

### public.current_biz_user_id()

현재 로그인한 업체 사용자의 내부 `biz_users.id`를 반환합니다.

기준:

- `biz_users.auth_user_id = auth.uid()`
- `status = 'approved'`
- `role in ('company_owner', 'company_staff', 'company_user')`

용도:

- `requested_by`처럼 `biz_users.id`를 참조하는 FK 컬럼 검증에 사용합니다.

### public.current_biz_company_id()

현재 로그인한 업체 사용자의 `company_id`를 반환합니다.

기준:

- `biz_users.auth_user_id = auth.uid()`
- `status = 'approved'`
- `role in ('company_owner', 'company_staff', 'company_user')`

용도:

- 업체 사용자의 자기 회사 데이터만 조회/등록하게 제한합니다.

### public.is_biz_admin()

현재 로그인 사용자가 승인된 관리자 계정인지 반환합니다.

기준:

- `biz_users.auth_user_id = auth.uid()`
- `status = 'approved'`
- `role = 'admin'`

용도:

- 관리자 전체 접근 정책에 사용합니다.

보안 설정:

- helper 함수는 `security definer`로 설계합니다.
- `search_path = public`으로 고정합니다.
- 실제 운영 전 함수 owner, execute 권한, RLS 우회 가능성을 다시 검토해야 합니다.

## 적용 대상

RLS 적용 대상 테이블:

- `biz_companies`
- `biz_users`
- `biz_purchase_requests`
- `biz_purchase_items`
- `biz_balance_ledger`
- `biz_withdraw_requests`
- `biz_admin_logs`

View 검토 대상:

- `biz_company_balances`

## 테이블별 정책

### 1. biz_companies

업체 사용자:

- 자기 회사 row만 `select` 가능
- `insert/update/delete` 불가

관리자:

- 전체 `select/insert/update/delete` 가능

주의:

- 업체 등록 신청을 프론트에서 익명/비로그인으로 받을 경우 별도 신청 테이블 또는 Edge Function/RPC가 필요합니다.
- 현재 RLS 초안은 승인된 사용자 기준입니다.

### 2. biz_users

업체 사용자:

- 자기 계정 row만 `select` 가능
- 같은 회사의 다른 사용자 row 조회 금지
- 직접 `insert/update/delete` 불가

관리자:

- 전체 `select/insert/update/delete` 가능

주의:

- `biz_users`에는 `password_hash`가 있어 같은 회사 사용자 목록 조회도 민감 정보 노출 위험이 있습니다.
- 회사 사용자 목록이 필요하면 `password_hash`, `phone` 등 민감 컬럼이 없는 safe view 또는 RPC를 별도로 제공합니다.
- 장기적으로 Supabase Auth를 사용하면 `password_hash` 컬럼은 필요 없을 가능성이 큽니다.
- 직접 비밀번호 저장 방식은 비추천이며, 유지하더라도 서버 전용 접근만 허용해야 합니다.
- 비밀번호 변경, 내 정보 수정은 직접 테이블 update보다 서버 API/RPC로 처리하는 방향이 안전합니다.

### 3. biz_purchase_requests

업체 사용자:

- 자기 회사 매입 신청만 `select` 가능
- 자기 회사 매입 신청만 `insert` 가능
- insert 시 `requested_by = public.current_biz_user_id()`와 `status = 'pending'` 조건 필요
- 직접 `update/delete` 불가

관리자:

- 전체 `select/insert/update/delete` 가능

주의:

- 현재 RLS 초안은 업체의 `biz_purchase_requests` 직접 insert를 제한적으로 허용하지만, 장기적으로는 `create_purchase_request` RPC 사용을 권장합니다.
- 매입 승인/반려는 관리자가 직접 여러 SQL을 실행하지 않고 RPC로 처리하는 방향입니다.
- 승인 RPC는 `status = approved` 변경과 `biz_balance_ledger` insert를 transaction으로 묶어야 합니다.

### 4. biz_purchase_items

업체 사용자:

- 자기 회사 아이템만 `select` 가능
- 직접 `insert/update/delete` 불가

관리자:

- 전체 `select/insert/update/delete` 가능

주의:

- 업체는 `biz_purchase_items`를 직접 insert하지 않습니다.
- 핀번호 등록은 추후 `create_purchase_request` RPC에서 request와 items를 하나의 transaction으로 생성합니다.
- `biz_purchase_items.company_id`는 상위 `biz_purchase_requests.company_id`와 같아야 합니다.
- 상위 접수건과 아이템의 업체 ID 일관성은 서버 API/RPC에서 강제하고, 필요 시 DB trigger로 2차 보호합니다.

### 5. biz_balance_ledger

업체 사용자:

- 자기 회사 ledger만 `select` 가능
- 직접 `insert/update/delete` 불가

관리자:

- 전체 `select/insert` 가능
- `update/delete` 불가

운영 원칙:

- ledger는 업체 사용자가 직접 만들 수 없습니다.
- 매입 승인, 출금 처리완료, 관리자 조정은 관리자 또는 RPC만 생성합니다.
- 중복 적립/차감은 기존 schema의 partial unique index로 최종 방어합니다.
- 잘못된 원장은 삭제하거나 수정하지 않고 `manual_adjust` 또는 정정 ledger row를 새로 추가합니다.
- 생성 후 수정/삭제하지 않는 append-only 구조로 운영합니다.

### 6. biz_withdraw_requests

업체 사용자:

- 자기 회사 출금 신청만 `select` 가능
- 자기 회사 출금 신청만 `insert` 가능
- insert 시 `requested_by = public.current_biz_user_id()`와 `status = 'pending'` 조건 필요
- 직접 `update/delete` 불가

관리자:

- 전체 `select/insert/update/delete` 가능

주의:

- 현재 RLS 초안은 업체의 `biz_withdraw_requests` 직접 insert를 제한적으로 허용하지만, 장기적으로는 `create_withdraw_request` RPC 사용을 권장합니다.
- 출금 신청 시에는 ledger를 만들지 않습니다.
- 출금 완료 RPC에서 잔액 재검증, 상태 변경, ledger insert를 transaction으로 묶어야 합니다.
- 계좌정보는 저장하지 않는 기존 원칙을 유지합니다.

### 7. biz_admin_logs

업체 사용자:

- 접근 불가

관리자:

- 전체 `select/insert` 가능
- `update/delete` 불가

운영 원칙:

- 감사 로그는 생성 후 수정/삭제하지 않는 append-only 구조로 운영합니다.
- 잘못된 감사 로그는 삭제하지 않고 추가 로그나 메모로 정정하는 방식이 원칙입니다.

## biz_company_balances view 검토

PostgreSQL view에는 테이블처럼 직접 RLS policy를 붙이지 않습니다.

현재 방향:

- `biz_company_balances`는 `biz_companies`와 `biz_balance_ledger`를 참조합니다.
- RLS는 참조 테이블 정책에 의존합니다.
- RLS SQL 보완안에서는 view를 `security_invoker = true`로 재생성합니다.

추가 검토:

- Supabase/PostgreSQL 15 이상에서는 view를 `security_invoker = true`로 만드는 방식을 사용합니다.
- Supabase 프로젝트의 PostgreSQL 버전이 `security_invoker` view를 지원하는지 실행 전 확인해야 합니다.
- 지원하지 않는 버전이면 view 대신 RPC 또는 직접 ledger 조회 정책을 검토합니다.
- RLS 적용 후 업체 A 계정에서 업체 B 잔액이 보이지 않는지 반드시 테스트합니다.

## 삭제 및 수정 정책

현재 초안:

- 업체 사용자는 delete 불가
- `biz_balance_ledger` update/delete 불가
- `biz_admin_logs` update/delete 불가
- 일부 업무 테이블은 관리자 delete 가능

운영 권장:

- 매입 신청, 출금 신청, ledger, admin_logs는 실제 삭제보다 상태 변경 또는 정정 로그 방식이 안전합니다.
- 최종 운영 전 `biz_purchase_requests`, `biz_purchase_items`, `biz_withdraw_requests`의 관리자 delete도 상태 변경 방식으로 제한할지 검토합니다.

## 다음 단계 RPC 목록

다음 단계에서 아래 RPC 또는 서버 API를 설계합니다.

- `create_company_application`
- `approve_company_application`
- `create_purchase_request`
- `approve_purchase_request`
- `reject_purchase_request`
- `create_withdraw_request`
- `complete_withdraw_request`
- `reject_withdraw_request`
- `create_manual_ledger_adjustment`

RPC 설계 원칙:

- 상태 변경과 원장 생성을 하나의 transaction으로 묶습니다.
- 업체 ID 일관성을 RPC 내부에서 검증합니다.
- 출금 신청/완료 시 잔액 초과 여부를 RPC 내부에서 재검증합니다.
- RLS는 최후 방어선이고, 비즈니스 규칙은 RPC/API가 담당합니다.

## 업체 등록 신청 흐름

현재 RLS는 승인된 로그인 사용자 기준입니다.

비로그인 업체 등록 신청은 현재 구조와 맞지 않으므로 별도 설계가 필요합니다.

검토 방향:

- 별도 public 신청 테이블: `biz_company_applications`
- Edge Function 또는 RPC로 신청 접수
- 관리자 승인 시 `biz_companies`, `biz_users` 생성

## 실행 주의

- `supabase/seumbiz-rls.sql`은 아직 실행하지 않습니다.
- 기존 `supabase/seumbiz-schema.sql`이 먼저 실행되어 있어야 합니다.
- RLS 실행 후 프론트 연결 전 반드시 테스트 계정으로 접근 범위를 검증해야 합니다.
- 기존 세움기프트 Supabase 프로젝트와 혼동하지 않아야 합니다.
