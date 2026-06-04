# 세움Biz DB 설계 초안

이 문서는 세움Biz 업체 전용 플랫폼의 Supabase 테이블 구조 초안입니다. 현재 단계에서는 설계 파일만 작성하며, Supabase에 SQL을 실행하지 않습니다.

## 핵심 원칙

- 업체 잔액은 `biz_companies` 같은 마스터 테이블에 별도 balance 컬럼으로 저장하지 않습니다.
- 업체 잔액은 항상 `biz_balance_ledger.amount` 합계로 계산합니다.
- 매입 신청은 승인완료 시점에만 `biz_balance_ledger`에 플러스 금액을 기록합니다.
- 출금 신청 시점에는 잔액을 차감하지 않습니다.
- 출금은 관리자 처리완료 시점에만 `biz_balance_ledger`에 마이너스 금액을 기록합니다.
- 관리자 차감, 관리자 선지급, 복구, 수동 조정도 모두 원장 로그로 남깁니다.
- 모든 핵심 테이블은 `created_at`, `updated_at`을 기본으로 가집니다.
- 상태값은 `text` 컬럼과 `CHECK` 제약으로 관리합니다.
- RLS 정책은 다음 단계에서 별도 설계합니다.
- 승인/출금 완료처럼 잔액이 변하는 처리는 프론트에서 여러 SQL을 직접 실행하지 않고, 서버 API 또는 Supabase RPC 한 개로 transaction 처리합니다.
- 중복 승인/중복 출금 완료는 `biz_balance_ledger`의 partial unique index로 최종 방어합니다.

## 테이블 구성

### 1. biz_companies

업체 마스터 테이블입니다.

주요 컬럼:

- `id`: 업체 고유 ID
- `company_name`: 업체명
- `manager_name`: 담당자명
- `phone`: 연락처
- `kakao_id`: 카카오톡 ID
- `default_rate`: 업체별 기본 매입 요율
- `status`: 업체 상태
- `memo`: 운영 메모
- `approved_at`, `rejected_at`, `suspended_at`: 상태 처리 시각

상태값:

- `pending`: 승인대기
- `approved`: 승인완료
- `rejected`: 반려
- `suspended`: 정지

주의:

- 업체 잔액 컬럼은 두지 않습니다.
- 업체 기본 요율은 이 테이블의 `default_rate`에 저장합니다.

### 2. biz_users

업체 사용자 및 관리자 계정 테이블입니다.

주요 컬럼:

- `id`: 사용자 고유 ID
- `auth_user_id`: Supabase Auth 사용자 ID. `auth.users.id`와 연결하며 로그인 사용자 식별에 사용
- `company_id`: 소속 업체 ID. 관리자 계정은 `null` 가능
- `login_id`: 로그인 ID
- `password_hash`: 기존 직접 로그인 방식 흔적. Supabase Auth 사용 시 사용 중단 방향이며 프론트에 노출하지 않음
- `name`: 사용자명
- `phone`: 연락처
- `role`: 권한
- `status`: 사용자 상태
- `last_login_at`: 마지막 로그인 시각

권한 예시:

- `company_user`: 업체 일반 사용자
- `company_staff`: 업체 실무 사용자
- `company_owner`: 업체 대표 사용자
- `admin`: 관리자

주의:

- `admin` 역할은 전역 관리자 계정으로 보고 `company_id`를 `null`로 둘 수 있습니다.
- `company_user`, `company_staff`, `company_owner` 역할은 반드시 `company_id`를 가져야 합니다.
- SQL 초안에는 역할별 `company_id` 필수 여부를 `CHECK` 제약으로 반영했습니다.
- Supabase Auth 로그인 후에는 `auth.uid()`와 `biz_users.auth_user_id`를 매칭해 업체 사용자 row를 찾습니다.
- `biz_users.id`는 기존 내부 row ID로 유지하며 `requested_by`, `reviewed_by`, `created_by`, `processed_by` 같은 FK 컬럼에 사용합니다.
- `password_hash`는 삭제하지 않지만 신규 인증 흐름에서는 사용하지 않는 방향입니다.
- 프론트에서 민감 테이블을 직접 조작하지 않는 것을 전제로 합니다.

### 3. biz_purchase_requests

매입 신청의 접수 단위 테이블입니다. 핀번호 1개 단위가 아니라 접수번호 1개를 기준으로 관리합니다.

주요 컬럼:

- `id`: 매입 신청 고유 ID
- `company_id`: 업체 ID
- `requested_by`: 신청 사용자 ID
- `receipt_no`: 접수번호
- `giftcard_type`: 상품권 종류
- `item_count`: 접수된 핀번호 수
- `total_face_value`: 총 액면가
- `applied_rate`: 접수 당시 적용 요율
- `expected_settlement_amount`: 예상 정산금
- `approved_settlement_amount`: 승인 확정 정산금
- `status`: 매입 신청 상태
- `submitted_memo`: 업체 신청 메모
- `admin_memo`: 관리자 메모
- `reviewed_by`, `reviewed_at`: 검수 담당자와 검수 시각
- `approved_at`, `rejected_at`, `canceled_at`: 상태 처리 시각

상태값:

- `pending`: 접수대기
- `reviewing`: 검수중
- `approved`: 승인완료
- `rejected`: 반려
- `canceled`: 취소

접수번호:

- 컬럼: `receipt_no`
- 예시: `BIZ-20260531-0001`
- `unique` 제약으로 중복을 막습니다.

요율 원칙:

- 업체 기본 요율은 `biz_companies.default_rate`에 저장합니다.
- 매입 신청 당시 적용 요율은 `biz_purchase_requests.applied_rate`에 별도로 저장합니다.
- 이후 업체 요율이 변경되어도 과거 접수건의 예상 정산금과 승인 정산금은 바뀌지 않습니다.

### 4. biz_purchase_items

매입 신청 안에 포함된 핀번호 단위 상세 테이블입니다.

주요 컬럼:

- `id`: 아이템 고유 ID
- `purchase_request_id`: 상위 매입 신청 ID
- `company_id`: 업체 ID
- `giftcard_type`: 상품권 종류
- `pin_no`: 핀번호
- `face_value`: 액면가
- `ocr_source`: OCR 또는 이미지 출처 정보
- `ocr_confidence`: OCR 신뢰도
- `status`: 아이템 상태
- `admin_memo`: 관리자 메모

주의:

- OCR 실제 구현은 별도 단계입니다.
- 이 테이블은 접수 상세 화면에서 핀번호 리스트를 보여주기 위한 구조입니다.
- `biz_purchase_items.company_id`는 상위 `biz_purchase_requests.company_id`와 반드시 같아야 합니다.
- 이번 단계에서는 과도한 DB 트리거를 만들지 않고, 실제 강제는 서버 API/RPC 단계에서 처리합니다.
- 추후 운영 안정화 후 필요하면 DB trigger로 업체 ID 불일치를 2차 방어합니다.

핀번호 중복 방지 정책:

- 이번 단계에서는 `pin_no` 원문에 unique 제약을 걸지 않습니다.
- 핀번호는 민감 정보일 수 있으므로 추후 `pin_hash` 컬럼 도입을 검토합니다.
- 같은 상품권 핀번호 재접수 방지는 `pin_hash` 기반 unique 정책으로 처리할 수 있습니다.
- OCR/직접 입력 흐름이 안정화된 뒤 중복 방지 범위와 해시 방식을 확정합니다.

### 5. biz_balance_ledger

업체 잔액 원장 테이블입니다. 세움Biz 잔액 계산의 기준이 되는 핵심 테이블입니다.

주요 컬럼:

- `id`: 원장 로그 ID
- `company_id`: 업체 ID
- `purchase_request_id`: 관련 매입 신청 ID
- `withdraw_request_id`: 관련 출금 신청 ID
- `amount`: 잔액 변동 금액
- `ledger_type`: 원장 유형
- `reason`: 사유
- `memo`: 메모
- `created_by`: 처리 사용자 ID

ledger type:

- `purchase_approved`: 매입 승인 반영, 플러스 금액
- `withdraw_completed`: 출금 처리완료, 마이너스 금액
- `admin_deduct`: 관리자 차감, 마이너스 금액
- `admin_advance`: 관리자 선지급 또는 선입금, 마이너스 금액
- `admin_restore`: 관리자 복구, 플러스 금액
- `manual_adjust`: 수동 조정, 플러스 또는 마이너스 가능

금액 방향:

- 매입 승인 반영: `+amount`
- 출금 처리완료: `-amount`
- 관리자 차감: `-amount`
- 관리자 선지급/선입금: `-amount`
- 관리자 복구: `+amount`
- 수동 조정: 상황에 따라 `+amount` 또는 `-amount`

잔액 계산:

```sql
select coalesce(sum(amount), 0) as balance_amount
from public.biz_balance_ledger
where company_id = :company_id;
```

주의:

- 출금 신청만으로는 이 테이블에 로그를 만들지 않습니다.
- 관리자 처리완료 시점에만 `withdraw_completed` 로그를 생성합니다.
- SQL 초안에는 `biz_company_balances` view를 포함해 업체별 잔액 조회를 쉽게 할 수 있게 했습니다.
- `ledger_type = 'purchase_approved'` 로그는 같은 `purchase_request_id`에 대해 1개만 허용합니다.
- `ledger_type = 'withdraw_completed'` 로그는 같은 `withdraw_request_id`에 대해 1개만 허용합니다.
- 위 중복 방지는 partial unique index로 처리합니다.
- `biz_balance_ledger.company_id`는 연결된 `purchase_request_id` 또는 `withdraw_request_id`의 `company_id`와 반드시 같아야 합니다.
- 이번 단계에서는 업체 ID 일관성을 서버 API/RPC에서 강제하고, 추후 필요하면 DB trigger로 2차 보호합니다.

### 6. biz_withdraw_requests

업체 잔액 출금 신청 테이블입니다.

주요 컬럼:

- `id`: 출금 신청 ID
- `company_id`: 업체 ID
- `requested_by`: 신청 사용자 ID
- `amount`: 출금 신청 금액
- `status`: 출금 신청 상태
- `memo`: 업체 메모
- `admin_memo`: 관리자 메모
- `processed_by`: 처리 관리자 ID
- `processed_at`: 처리 시각

상태값:

- `pending`: 출금대기
- `completed`: 처리완료
- `rejected`: 반려
- `canceled`: 취소

출금 운영 원칙:

- 사이트에는 계좌정보를 저장하지 않습니다.
- 계좌 확인과 실제 이체는 카카오톡으로 수동 처리합니다.
- 출금 신청 생성 시에는 잔액을 차감하지 않습니다.
- 관리자 처리완료 시점에만 `biz_balance_ledger`에 `withdraw_completed` 마이너스 로그를 기록합니다.

잔액 초과 방지 정책:

- DB `CHECK` 제약만으로는 ledger 합산 잔액을 즉시 검증하기 어렵습니다.
- 출금 신청 시 서버 API/RPC에서 현재 잔액을 계산합니다.
- 신청 금액이 현재 잔액보다 크면 신청을 거절합니다.
- 처리완료 시점에도 잔액을 다시 검증합니다.
- 동시성 방지를 위해 출금 처리 RPC에서 transaction으로 상태 변경과 ledger 생성을 묶습니다.

### 7. biz_admin_logs

관리자 작업 감사 로그 테이블입니다.

주요 컬럼:

- `id`: 로그 ID
- `company_id`: 관련 업체 ID
- `admin_user_id`: 작업 관리자 ID
- `target_table`: 대상 테이블명
- `target_id`: 대상 레코드 ID
- `action`: 작업명
- `before_data`: 변경 전 데이터
- `after_data`: 변경 후 데이터
- `memo`: 관리자 메모

기록 대상 예시:

- 업체 승인/반려/정지
- 매입 신청 승인/반려/취소
- 출금 신청 처리완료/반려/취소
- 관리자 차감/선지급/복구/수동 조정

## 데이터 흐름

### 업체 등록 신청

1. 업체가 등록 신청을 합니다.
2. `biz_companies.status`는 `pending`으로 생성됩니다.
3. 업체 사용자도 `biz_users.status = pending` 상태로 생성됩니다.
4. 관리자가 승인하면 업체와 사용자의 상태를 `approved`로 변경합니다.
5. 승인/반려/정지 작업은 `biz_admin_logs`에 기록합니다.

### 매입 신청

1. 업체가 상품권 종류와 핀번호를 등록합니다.
2. `biz_purchase_requests`에 접수 단위 레코드를 생성합니다.
3. 각 핀번호는 `biz_purchase_items`에 생성합니다.
4. 신청 당시 업체 기본 요율을 `applied_rate`에 저장합니다.
5. 상태는 처음 `pending`, 검수 시작 시 `reviewing`으로 관리합니다.

### 매입 승인

1. 관리자가 접수건을 검수합니다.
2. 승인 시 `biz_purchase_requests.status = approved`로 변경합니다.
3. 승인 확정 금액을 `approved_settlement_amount`에 저장합니다.
4. 같은 시점에 `biz_balance_ledger`에 `purchase_approved` 플러스 로그를 생성합니다.
5. 이 로그가 업체 잔액 증가의 유일한 근거가 됩니다.
6. 상태 변경과 ledger 생성은 반드시 매입 승인 RPC 하나에서 transaction으로 처리합니다.
7. 같은 접수건에 대한 중복 적립은 `uq_ledger_purchase_approved_once` partial unique index로 최종 방어합니다.

### 출금 신청

1. 업체가 출금 금액을 입력하고 신청합니다.
2. `biz_withdraw_requests.status = pending`으로 생성됩니다.
3. 이 단계에서는 `biz_balance_ledger`에 어떤 로그도 만들지 않습니다.
4. 계좌 확인과 실제 이체는 카카오톡으로 진행합니다.

### 출금 처리완료

1. 관리자가 카카오톡으로 계좌를 확인하고 수동 이체합니다.
2. 관리자 화면에서 처리완료로 변경합니다.
3. `biz_withdraw_requests.status = completed`로 변경하고 `processed_at`을 기록합니다.
4. 같은 시점에 `biz_balance_ledger`에 `withdraw_completed` 마이너스 로그를 생성합니다.
5. 반려 또는 취소 시에는 잔액 차감 로그를 만들지 않습니다.
6. 상태 변경과 ledger 생성은 반드시 출금 완료 RPC 하나에서 transaction으로 처리합니다.
7. 같은 출금 신청에 대한 중복 차감은 `uq_ledger_withdraw_completed_once` partial unique index로 최종 방어합니다.

### 관리자 잔액 조정

관리자 조정은 모두 `biz_balance_ledger`에 기록합니다.

- 관리자 차감: `admin_deduct`, 마이너스 금액
- 관리자 선지급/선입금: `admin_advance`, 마이너스 금액
- 관리자 복구: `admin_restore`, 플러스 금액
- 기타 수동 조정: `manual_adjust`, 플러스 또는 마이너스

## 보안 전제

- Supabase service role key는 서버 전용으로만 사용합니다.
- 프론트엔드에서 민감 테이블을 직접 조작하지 않습니다.
- 매입 승인, 출금 완료, 관리자 잔액 조정은 프론트에서 직접 여러 SQL을 실행하지 않습니다.
- 잔액 변동 처리는 서버 API 또는 Supabase RPC 함수 하나로 묶어 transaction 처리합니다.
- 업체는 자기 업체 데이터만 조회할 수 있어야 합니다.
- 관리자는 승인, 반려, 처리완료, 잔액 조정 작업을 할 수 있습니다.
- RLS 정책과 API 권한 설계는 다음 단계에서 별도 문서로 설계합니다.

## SQL 파일

SQL 초안 파일:

- `supabase/seumbiz-schema.sql`

주의:

- 이 SQL은 아직 Supabase에 실행하지 않습니다.
- RLS, 운영 권한, 실제 마이그레이션 순서는 다음 단계에서 검토합니다.
## 상품권 관리 1단계 설계 보강

SEUMBiz 상품권은 기존 세움기프트 상품권 테이블과 섞지 않고 `public.biz_giftcard_types`를 단일 기준으로 관리합니다. 업체 신규 매입신청 화면, 업체 매입내역, 관리자 매입신청 목록/상세, 향후 정산 화면에서 상품권은 항상 `[로고 + 상품권명]` 세트로 표시합니다. 상품권명 문자열만으로 분기하지 않고 `code`를 기준으로 처리합니다.

### biz_giftcard_types

SEUMBiz 전용 상품권 마스터 테이블입니다.

주요 컬럼:

- `id`: 상품권 마스터 ID
- `code`: 상품권 코드. 대문자, 숫자, 언더스코어만 허용하며 `unique`입니다.
- `name`: 상품권명. 빈 문자열은 허용하지 않습니다.
- `logo_url`: 상품권 로고 경로. 로고 없는 상품권 등록을 막기 위해 빈 문자열을 허용하지 않습니다.
- `default_rate`: 상품권 기본 요율. 0 초과 100 이하만 허용합니다.
- `enabled_amounts`: 사용 가능한 액면가 목록을 담는 jsonb array입니다.
- `is_visible`: 신규 매입신청 화면 노출 여부입니다.
- `is_active`: 신규 접수 가능 여부입니다.
- `sort_order`: 향후 Drag & Drop 정렬을 위한 순서값입니다.
- `admin_memo`: 관리자 메모입니다.

운영 원칙:

- 삭제 기능은 만들지 않습니다.
- 상품권을 숨기거나 중단할 때는 `is_visible=false` 또는 `is_active=false`를 사용합니다.
- `is_visible=false`는 신규 신청 화면에서만 숨김 처리합니다.
- 기존 신청/내역/관리자 조회 데이터는 사라지면 안 됩니다.
- 상품권 로고는 상품권명과 한 세트이며, 로고 없는 상품권 등록은 금지합니다.
- 상품권 목록에 현재 신청 건수 컬럼이 필요하면 마스터 테이블에 저장하지 않고 API 조회 시 `biz_purchase_requests.giftcard_code` 기준으로 집계합니다.

### biz_purchase_requests 상품권 snapshot

기존 매입신청 테이블에는 상품권 마스터 변경과 과거 접수 표시를 분리하기 위해 snapshot 컬럼을 추가합니다. 기존 데이터 보호를 위해 모두 nullable로 추가합니다.

추가 컬럼:

- `giftcard_code`: 접수 당시 선택한 상품권 코드
- `giftcard_name_snapshot`: 접수 당시 상품권명
- `giftcard_logo_url_snapshot`: 접수 당시 상품권 로고 URL
- `giftcard_rate_snapshot`: 접수 당시 상품권 요율

주의:

- 기존 `giftcard_type` 컬럼은 당장 삭제하지 않습니다.
- 현재 `create_purchase_request` RPC는 이번 단계에서 수정하지 않습니다.
- 다음 단계에서 RPC가 `giftcard_code`를 기준으로 상품권 마스터를 조회하고, 접수 당시 이름/로고/요율 snapshot을 저장하도록 보완합니다.
- 과거 접수 내역은 상품권 마스터의 이름/로고가 변경되어도 snapshot 기준으로 표시합니다.

### 기본 seed 상품권

1차 seed:

- `LOTTE`: 롯데상품권, 기본 요율 92.00, 액면가 `[100000,300000,500000]`
- `CULTURE`: 컬쳐랜드, 기본 요율 91.00, 액면가 `[100000,300000,500000]`
- `BOOK`: 북앤라이프, 기본 요율 90.00, 액면가 `[100000,300000]`
- `HAPPY`: 해피머니, 기본 요율 90.00, 액면가 `[100000,300000]`

임시 로고 경로는 `/assets/giftcards/*.png` 형식으로 저장합니다. 실제 로고 업로드와 Supabase Storage 정책은 관리자 상품권 관리 화면 구현 단계에서 별도로 확정합니다.
