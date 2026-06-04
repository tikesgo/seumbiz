# 세움Biz RPC 설계 초안

이 문서는 세움Biz Supabase RPC 설계 초안입니다. 현재 단계에서는 `create_purchase_request`만 설계하며, Supabase SQL Editor에는 아직 실행하지 않습니다.

## 1단계 RPC

- SQL 파일: `supabase/seumbiz-rpc.sql`
- 함수명: `public.create_purchase_request`
- 목적: 업체 매입신청 접수와 핀번호 아이템 생성을 하나의 transaction으로 처리

## create_purchase_request 목표

업체 사용자가 매입신청을 할 때 아래 작업을 한 번에 처리합니다.

1. `biz_purchase_requests` 생성
2. `biz_purchase_items` 생성
3. `item_count` 계산
4. `total_face_value` 계산
5. `expected_settlement_amount` 계산
6. 접수번호 `receipt_no` 생성
7. `giftcard_code`로 상품권 마스터를 조회하고 접수 당시 상품권명/로고/요율 snapshot 저장
8. 상품권 마스터의 `default_rate`를 `applied_rate`에 고정 저장

## 기본 전제

- Supabase Auth 사용자는 `biz_users.auth_user_id = auth.uid()`로 연결합니다.
- `biz_users.id`는 내부 FK용 사용자 row ID로 유지합니다.
- 호출자는 `company_owner`, `company_staff`, `company_user` 중 하나여야 합니다.
- 호출자의 `biz_users.status`는 `approved`여야 합니다.
- 호출자의 `biz_companies.status`도 `approved`여야 합니다.
- `create_purchase_request`는 업체 사용자 전용 RPC입니다.
- admin 계정 호출은 기본적으로 실패하는 것이 정상입니다. 관리자 접수 대행이 필요하면 별도 RPC를 검토합니다.
- 업체 사용자는 `biz_purchase_items`를 직접 insert하지 않고 이 RPC를 통해 등록합니다.
- `company_id`는 외부에서 받지 않고 `auth.uid()`로 찾은 `biz_users.auth_user_id` 기준으로 내부 결정합니다.
- 상품권은 이름 문자열이 아니라 `biz_giftcard_types.code` 기준으로 받습니다.
- 클라이언트가 보낸 요율은 신뢰하지 않고, RPC 내부에서 조회한 `biz_giftcard_types.default_rate`만 사용합니다.

## 함수 시그니처

```sql
public.create_purchase_request(
  p_giftcard_code text,
  p_items jsonb,
  p_submitted_memo text default null
)
```

반환값:

- `purchase_request_id`
- `receipt_no`
- `item_count`
- `total_face_value`
- `applied_rate`
- `expected_settlement_amount`

`p_giftcard_code`는 `biz_giftcard_types.code` 값입니다. RPC는 `code = upper(trim(p_giftcard_code))`, `is_visible = true`, `is_active = true` 조건을 만족하는 상품권만 접수합니다. 조회 실패 시 `등록 가능한 상품권이 아닙니다.` 오류를 반환합니다.

접수 생성 시 snapshot 저장:

- `biz_purchase_requests.giftcard_code = biz_giftcard_types.code`
- `biz_purchase_requests.giftcard_name_snapshot = biz_giftcard_types.name`
- `biz_purchase_requests.giftcard_logo_url_snapshot = biz_giftcard_types.logo_url`
- `biz_purchase_requests.giftcard_rate_snapshot = biz_giftcard_types.default_rate`
- `biz_purchase_requests.applied_rate = biz_giftcard_types.default_rate`

기존 호환을 위해 `biz_purchase_requests.giftcard_type`과 `biz_purchase_items.giftcard_type`에는 당분간 상품권명을 함께 저장합니다. 기존 컬럼은 삭제하지 않습니다.

## p_items JSON 구조

`p_items`는 JSON array입니다.

최소 구조:

```json
[
  {
    "pin_no": "2300000000000000",
    "face_value": 100000
  }
]
```

예시:

```json
[
  {
    "pin_no": "2300-0000-0000-0000",
    "face_value": 100000,
    "ocr_source": "image_upload",
    "ocr_confidence": 92.5
  },
  {
    "pin_no": "2300-1111-1111-1111",
    "face_value": 100000,
    "ocr_source": "manual",
    "ocr_confidence": null
  }
]
```

필수값:

- `pin_no`
- `face_value`

선택값:

- `ocr_source`
- `ocr_confidence`

고정 정책:

- `pin_no`는 필수입니다.
- `face_value`는 필수입니다.
- item마다 `face_value`는 필수입니다.
- `face_value`는 0보다 커야 합니다.
- OCR/수동입력 모두 최종 등록 전 `face_value`를 포함해야 합니다.
- `ocr_confidence`는 `null`을 허용합니다.
- `ocr_confidence` 값이 있으면 0 이상 100 이하이어야 합니다.

## 계산 방식

### item_count

`p_items` 배열의 유효 핀번호 개수를 계산합니다.

정책:

- `pin_no`가 없거나 빈 문자열이면 오류 처리합니다.
- 현재 초안에서는 모든 item에 `pin_no`가 있어야 합니다.
- `item_count`는 0보다 커야 합니다.

### total_face_value

각 item의 `face_value` 합계입니다.

정책:

- 모든 item은 `face_value`를 가져야 합니다.
- `face_value`는 0보다 커야 합니다.
- `total_face_value`는 0보다 커야 합니다.
- 0원 접수는 허용하지 않습니다.
- OCR/수동입력 모두 최종 등록 전 `face_value`를 포함해야 합니다.
- 관리자는 승인 단계에서 `approved_settlement_amount`로 최종 승인 금액을 조정할 수 있습니다.

### applied_rate

선택한 상품권의 `biz_giftcard_types.default_rate`를 사용합니다.

중요:

- 접수 당시 요율을 `biz_purchase_requests.applied_rate`에 저장합니다.
- 나중에 상품권 기본 요율이 바뀌어도 과거 접수건의 예상 정산금은 바뀌지 않습니다.
- 클라이언트가 전달한 요율 값은 사용하지 않습니다.

### expected_settlement_amount

계산식:

```sql
floor(total_face_value * applied_rate / 100)
```

정책:

- 원 단위 정수 금액을 기준으로 `floor` 처리합니다.
- 실제 정산 정책에서 반올림/버림 기준이 달라지면 이 계산식은 조정해야 합니다.
- 실제 승인 금액은 관리자 승인 RPC에서 `approved_settlement_amount`로 확정합니다.

## 접수번호 생성

형식:

```text
BIZ-YYYYMMDD-0001
```

예시:

```text
BIZ-20260601-0001
```

설계:

- 한국시간 기준 날짜를 사용합니다.
- 같은 날짜의 기존 `receipt_no` 최대 번호를 조회해 다음 번호를 만듭니다.
- 동시성 방지를 위해 `pg_advisory_xact_lock()`을 사용합니다.

주의:

- 접수번호 생성 정책은 초기 설계입니다.
- 트래픽이 많아지면 별도 sequence 테이블 또는 PostgreSQL sequence 기반 구조를 검토할 수 있습니다.

## Transaction 경계

PostgreSQL 함수 실행은 하나의 transaction 안에서 처리됩니다.

이 RPC에서 함께 처리되는 작업:

- 업체 사용자 검증
- 업체 승인 상태 검증
- item 검증
- 합계 계산
- 접수번호 생성
- `biz_purchase_requests` insert
- `biz_purchase_items` bulk insert

중간에 오류가 발생하면 전체 작업이 rollback됩니다.

## RLS와의 관계

현재 RLS 설계에서는 업체 사용자가 `biz_purchase_items`를 직접 insert할 수 없습니다.

따라서 업체 핀번호 등록은 이 RPC를 통해 처리합니다.

RPC는 `security definer`로 설계되어 있습니다.

주의:

- `security definer` 함수는 owner, execute 권한, search_path를 신중하게 관리해야 합니다.
- SQL 초안에는 `set search_path = public`을 명시했습니다.
- SQL 초안에는 함수 생성 후 execute 권한 제한을 포함합니다.
- `public`, `anon` 권한을 회수하고 `authenticated`에만 execute를 부여합니다.

권한 구문:

```sql
drop function if exists public.create_purchase_request(text, jsonb, text);
revoke all on function public.create_purchase_request(text, jsonb, text) from public;
revoke all on function public.create_purchase_request(text, jsonb, text) from anon;
grant execute on function public.create_purchase_request(text, jsonb, text) to authenticated;
```

## 아직 생성하지 않는 것

이 RPC는 매입 신청 생성까지만 처리합니다.

아직 처리하지 않는 것:

- 관리자 승인
- ledger 적립
- 반려 처리
- OCR 실제 처리
- 핀번호 중복 검증
- 이미지 파일 저장

승인 시 잔액 반영은 다음 RPC에서 처리합니다.

예정 RPC:

- `approve_purchase_request`
- `reject_purchase_request`

## 추가 검토 필요

1. `face_value` 입력 정책
   - 현재 초안은 item마다 `face_value`를 필수로 봅니다.
   - 실제 매입신청 UI에서 액면가를 입력하지 않는 흐름이라면 최종 등록 전 단계에서 금액 확인 UI 또는 OCR/추출 결과 검수 UI가 필요합니다.
   - 관리자는 승인 단계에서 `approved_settlement_amount`로 최종 승인 금액을 조정할 수 있습니다.

2. 핀번호 중복 방지
   - 현재 원문 `pin_no` unique는 걸지 않습니다.
   - 추후 `pin_hash` 도입 후 중복 접수를 막는 정책을 검토합니다.

3. 관리자 대리 접수
   - 현재 함수는 업체 사용자 호출 기준입니다.
   - 관리자가 특정 업체 대신 접수하는 기능이 필요하면 별도 admin RPC가 필요합니다.

4. 권한 부여
   - SQL 초안에 `public`, `anon` revoke와 `authenticated` grant를 포함했습니다.

5. RLS 테스트
   - 업체 A가 업체 B company_id로 request/items를 만들 수 없는지 확인해야 합니다.
   - 현재 RPC는 auth.uid() 기준으로 company_id를 내부에서 결정하므로 외부에서 company_id를 조작할 수 없습니다.

## 테스트 호출 예시

### 정상 호출

```sql
select *
from public.create_purchase_request(
  'CULTURE',
  '[{"pin_no":"2300000000000000","face_value":100000}]'::jsonb,
  '테스트 접수'
);
```

### 생성 확인 항목

- `biz_purchase_requests` 1건 생성
- `receipt_no = BIZ-YYYYMMDD-0001` 형식
- `item_count = 1`
- `total_face_value = 100000`
- `expected_settlement_amount = floor(total_face_value * applied_rate / 100)` 계산 확인
- `giftcard_code = CULTURE`
- `giftcard_name_snapshot`, `giftcard_logo_url_snapshot`, `giftcard_rate_snapshot` 저장 확인
- `biz_purchase_items`에 같은 `purchase_request_id`로 item 생성 확인

### 실패 테스트 예시

빈 배열:

```sql
select *
from public.create_purchase_request(
  'CULTURE',
  '[]'::jsonb,
  '빈 배열 테스트'
);
```

`pin_no` 누락:

```sql
select *
from public.create_purchase_request(
  'CULTURE',
  '[{"face_value":100000}]'::jsonb,
  'pin_no 누락 테스트'
);
```

`face_value` 누락:

```sql
select *
from public.create_purchase_request(
  'CULTURE',
  '[{"pin_no":"2300000000000000"}]'::jsonb,
  'face_value 누락 테스트'
);
```

`face_value = 0`:

```sql
select *
from public.create_purchase_request(
  'CULTURE',
  '[{"pin_no":"2300000000000000","face_value":0}]'::jsonb,
  '0원 테스트'
);
```

`ocr_confidence = 101`:

```sql
select *
from public.create_purchase_request(
  'CULTURE',
  '[{"pin_no":"2300000000000000","face_value":100000,"ocr_confidence":101}]'::jsonb,
  'OCR 신뢰도 범위 테스트'
);
```

비로그인/anon:

- `auth.uid()`가 없으므로 `Authentication required` 오류가 나야 합니다.

admin 계정 호출:

- `role = 'admin'`은 업체 사용자 조건에 맞지 않으므로 호출 실패가 정상입니다.

### 테스트 주의사항

- 테스트 전에 `approved` 상태의 `biz_companies`와 `biz_users`가 필요합니다.
- `biz_users.auth_user_id`는 `auth.uid()`와 같아야 합니다.
- `biz_users.id`는 기존 내부 row ID로 유지하며 `requested_by`, `reviewed_by`, `created_by`, `processed_by` 같은 FK 컬럼에 사용합니다.
- admin 계정은 이 함수 호출 실패가 정상입니다.
- `face_value`는 원 단위 정수만 사용합니다.
- 기존 세움기프트 Supabase 프로젝트와 혼동하지 않아야 합니다.
- 이 문서는 테스트 절차를 정리한 것이며, 여기서는 Supabase 실행을 하지 않습니다.

## approve_purchase_request 설계

### 목표

관리자가 매입신청을 승인할 때 아래 작업을 하나의 transaction으로 처리합니다.

1. `biz_purchase_requests.status = 'approved'`로 변경
2. `approved_settlement_amount` 확정
3. `approved_at`, `reviewed_at`, `reviewed_by` 기록
4. `admin_memo` 저장
5. `biz_balance_ledger`에 `purchase_approved` 플러스 금액 기록
6. 중복 승인 방지

### 함수 시그니처

```sql
public.approve_purchase_request(
  p_purchase_request_id uuid,
  p_approved_settlement_amount numeric default null,
  p_admin_memo text default null
)
```

반환값:

- `purchase_request_id`
- `receipt_no`
- `approved_settlement_amount`
- `ledger_id`

### 호출 권한

- 호출자는 `biz_users.role = 'admin'`이어야 합니다.
- `biz_users.status = 'approved'`이어야 합니다.
- 업체 사용자가 호출하면 실패해야 합니다.
- 비로그인/anon 호출은 실패해야 합니다.

권한 구문:

```sql
revoke all on function public.approve_purchase_request(uuid, numeric, text) from public;
revoke all on function public.approve_purchase_request(uuid, numeric, text) from anon;
grant execute on function public.approve_purchase_request(uuid, numeric, text) to authenticated;
```

### 승인 가능 상태

승인 가능한 상태:

- `pending`
- `reviewing`

승인 불가 상태:

- `approved`
- `rejected`
- `canceled`

이미 `approved` 상태이면 명확한 오류를 반환합니다.

### 승인 금액 결정

정책:

- `p_approved_settlement_amount`가 있으면 해당 값을 사용합니다.
- `p_approved_settlement_amount`가 `null`이면 `expected_settlement_amount`를 사용합니다.
- 승인 금액은 0보다 커야 합니다.

예시:

```text
expected_settlement_amount = 92,000
p_approved_settlement_amount = null
=> approved_settlement_amount = 92,000
```

### Ledger 기록

`biz_balance_ledger`에 아래 값으로 insert합니다.

- `company_id`: 승인 대상 request의 `company_id`
- `purchase_request_id`: 승인 대상 request id
- `amount`: 승인 금액, 플러스
- `ledger_type`: `purchase_approved`
- `reason`: `Purchase approved`
- `memo`: 관리자 메모
- `created_by`: 관리자 user id

중복 방지:

- 함수는 `pending`, `reviewing` 상태만 승인합니다.
- 같은 request가 이미 `approved`이면 실패합니다.
- schema의 partial unique index `uq_ledger_purchase_approved_once`가 같은 `purchase_request_id`의 중복 ledger insert를 최종 방어합니다.

### Transaction 경계

PostgreSQL 함수 실행은 하나의 transaction 안에서 처리됩니다.

함수 내부에서 함께 처리되는 작업:

- 관리자 검증
- 대상 request row lock
- 승인 가능 상태 검증
- 승인 금액 결정
- request 상태 update
- ledger insert

중간에 오류가 발생하면 상태 변경과 ledger insert 모두 rollback됩니다.

### 테스트 호출 예시

정상 승인:

```sql
select *
from public.approve_purchase_request(
  '구매요청_UUID',
  null,
  '승인 테스트'
);
```

승인 금액 직접 지정:

```sql
select *
from public.approve_purchase_request(
  '구매요청_UUID',
  92000,
  '승인 금액 직접 지정'
);
```

### 테스트 시나리오

1. 관리자 승인 성공
   - `biz_purchase_requests.status = 'approved'`
   - `approved_settlement_amount` 저장
   - `approved_at`, `reviewed_at`, `reviewed_by` 저장
   - `biz_balance_ledger`에 `purchase_approved` 플러스 금액 1건 생성

2. 업체 사용자가 승인 시도
   - `Admin role required` 오류로 실패해야 합니다.

3. 같은 request 두 번 승인
   - 두 번째 호출은 이미 `approved` 상태라 실패해야 합니다.
   - ledger 중복 insert는 partial unique index로도 방어됩니다.

4. `approved_settlement_amount <= 0`
   - `approved_settlement_amount must be greater than 0` 오류로 실패해야 합니다.

5. 승인 후 ledger 확인

```sql
select *
from public.biz_balance_ledger
where purchase_request_id = '구매요청_UUID'
  and ledger_type = 'purchase_approved';
```

6. 잔액 증가 확인

```sql
select *
from public.biz_company_balances
where company_id = '업체_UUID';
```

### 아직 처리하지 않는 것

- 반려 처리
- 승인 취소
- 승인 후 금액 정정
- 관리자 감사 로그 생성

위 항목은 다음 RPC에서 별도로 설계합니다.

## complete_withdraw_request 설계

### 목표

관리자가 출금 요청을 처리완료하면 아래 작업을 하나의 transaction으로 처리합니다.

1. `biz_withdraw_requests.status = 'completed'`로 변경
2. `processed_at`, `processed_by`, `admin_memo`, `updated_at` 기록
3. 처리완료 시점의 업체 잔액 재검증
4. `biz_balance_ledger`에 `withdraw_completed` 음수 금액 기록
5. 중복 처리 방지

### 함수 시그니처

```sql
public.complete_withdraw_request(
  p_withdraw_request_id uuid,
  p_admin_memo text default null
)
```

반환값:

- `withdraw_request_id`
- `company_id`
- `amount`
- `current_balance_before`
- `current_balance_after`
- `ledger_id`

### 호출 권한

- 호출자는 로그인한 관리자여야 합니다.
- `biz_users.role = 'admin'`이어야 합니다.
- `biz_users.status = 'approved'`여야 합니다.
- 업체 사용자가 호출하면 실패해야 합니다.
- 비로그인/anon 호출은 실패해야 합니다.

권한 구문:

```sql
revoke all on function public.complete_withdraw_request(uuid, text) from public;
revoke all on function public.complete_withdraw_request(uuid, text) from anon;
grant execute on function public.complete_withdraw_request(uuid, text) to authenticated;
```

### 처리 가능 상태

처리완료 가능한 상태:

- `pending`

처리완료 불가 상태:

- `completed`
- `rejected`
- `canceled`

이미 `completed` 상태이면 명확한 오류를 반환합니다.

### 잔액 재검증

출금 신청 시점에는 잔액을 차감하지 않기 때문에, 관리자 처리완료 시점에 현재 잔액을 다시 계산합니다.

현재 잔액 계산:

```sql
select coalesce(sum(amount), 0)
from public.biz_balance_ledger
where company_id = 출금요청의_업체_ID;
```

정책:

- 현재 잔액이 출금 요청 금액보다 작으면 실패합니다.
- 실패 시 `biz_withdraw_requests` 상태도 변경하지 않습니다.
- 실패 시 `biz_balance_ledger` 차감 로그도 만들지 않습니다.

### Ledger 기록

처리완료 성공 시 `biz_balance_ledger`에 아래 값으로 insert합니다.

- `company_id`: 출금 요청의 `company_id`
- `withdraw_request_id`: 처리한 출금 요청 ID
- `amount`: 출금 요청 금액의 음수값
- `ledger_type`: `withdraw_completed`
- `reason`: `Withdraw completed`
- `memo`: 관리자 메모
- `created_by`: 관리자 user id

중복 방지:

- 함수는 `pending` 상태만 처리합니다.
- 이미 `completed` 상태이면 실패합니다.
- schema의 partial unique index `uq_ledger_withdraw_completed_once`가 같은 `withdraw_request_id`의 중복 차감 ledger insert를 최종 방어합니다.

### Transaction 경계

PostgreSQL 함수 실행은 하나의 transaction 안에서 처리됩니다.

함수 내부에서 함께 처리되는 작업:

- 관리자 검증
- 대상 withdraw row lock
- 처리 가능 상태 검증
- 현재 잔액 재계산
- withdraw request 상태 update
- withdraw completed ledger insert

중간에 오류가 발생하면 상태 변경과 ledger insert 모두 rollback됩니다.

### 테스트 호출 예시

정상 처리완료:

```sql
select *
from public.complete_withdraw_request(
  '출금요청_UUID',
  'withdraw complete test'
);
```

### 테스트 시나리오

1. 관리자 처리완료 성공
   - `biz_withdraw_requests.status = 'completed'`
   - `processed_at`, `processed_by`, `admin_memo` 저장
   - `biz_balance_ledger`에 `withdraw_completed` 음수 금액 1건 생성

2. 업체 사용자가 처리완료 시도
   - `Admin role required` 오류로 실패해야 합니다.

3. 같은 withdraw_request 두 번 처리완료
   - 두 번째 호출은 이미 `completed` 상태라 실패해야 합니다.
   - ledger 중복 insert는 partial unique index로도 방어합니다.

4. 잔액 부족 상태에서 처리완료
   - `current balance is less than withdraw amount` 오류로 실패해야 합니다.

5. 처리완료 후 withdraw 상태 확인

```sql
select *
from public.biz_withdraw_requests
where id = '출금요청_UUID';
```

6. 처리완료 후 ledger 확인

```sql
select *
from public.biz_balance_ledger
where withdraw_request_id = '출금요청_UUID'
  and ledger_type = 'withdraw_completed';
```

7. 업체 잔액 감소 확인

```sql
select *
from public.biz_company_balances
where company_id = '업체_UUID';
```

예상 흐름:

```text
처리 전 잔액 92,000
출금 처리완료 50,000
처리 후 잔액 42,000
```

### 아직 처리하지 않는 것

- 출금 반려
- 출금 취소
- 카카오톡 안내 연동
- 관리자 감사 로그 생성

위 항목은 별도 RPC 또는 서버 로직에서 추가 설계합니다.

## reject_withdraw_request 설계

### 목표

관리자가 출금 요청을 반려하면 `biz_withdraw_requests` 상태만 `rejected`로 변경합니다.

중요 원칙:

- 반려 시 `biz_balance_ledger`에는 어떤 로그도 만들지 않습니다.
- 반려 시 업체 잔액은 변하지 않습니다.
- 계좌정보나 송금 처리도 하지 않습니다.

### 함수 시그니처

```sql
public.reject_withdraw_request(
  p_withdraw_request_id uuid,
  p_admin_memo text default null
)
```

반환값:

- `withdraw_request_id`
- `company_id`
- `amount`
- `status`
- `processed_by`
- `processed_at`

### 호출 권한

- 호출자는 로그인한 관리자여야 합니다.
- `biz_users.role = 'admin'`이어야 합니다.
- `biz_users.status = 'approved'`여야 합니다.
- 업체 사용자가 호출하면 실패해야 합니다.
- 비로그인/anon 호출은 실패해야 합니다.

권한 구문:

```sql
revoke all on function public.reject_withdraw_request(uuid, text) from public;
revoke all on function public.reject_withdraw_request(uuid, text) from anon;
grant execute on function public.reject_withdraw_request(uuid, text) to authenticated;
```

### 반려 가능 상태

반려 가능한 상태:

- `pending`

반려 불가 상태:

- `completed`
- `rejected`
- `canceled`

상태별 오류:

- `completed`: 완료된 출금 요청은 반려할 수 없다는 오류를 반환합니다.
- `rejected`: 이미 반려된 출금 요청이라는 오류를 반환합니다.
- 기타 상태: pending 출금 요청만 반려 가능하다는 오류를 반환합니다.

### 업데이트 내용

성공 시 `biz_withdraw_requests`에 아래 값을 기록합니다.

- `status`: `rejected`
- `admin_memo`: 관리자 메모
- `processed_by`: 관리자 user id
- `processed_at`: 현재 시각
- `updated_at`: 현재 시각

생성하지 않는 데이터:

- `biz_balance_ledger` insert 없음
- 업체 잔액 차감 없음
- 업체 잔액 복구 없음

### Transaction 경계

PostgreSQL 함수 실행은 하나의 transaction 안에서 처리됩니다.

함수 내부에서 함께 처리되는 작업:

- 관리자 검증
- 대상 withdraw row lock
- 반려 가능 상태 검증
- withdraw request 상태 update

중간에 오류가 발생하면 상태 변경은 rollback됩니다.

### 테스트 호출 예시

정상 반려:

```sql
select *
from public.reject_withdraw_request(
  '출금요청_UUID',
  'withdraw reject test'
);
```

### 테스트 시나리오

1. 관리자 반려 성공
   - `biz_withdraw_requests.status = 'rejected'`
   - `processed_at`, `processed_by`, `admin_memo` 저장
   - `biz_balance_ledger`에는 새 로그가 없어야 합니다.

2. 업체 사용자가 반려 시도
   - `Admin role required` 오류로 실패해야 합니다.

3. 같은 withdraw_request 두 번 반려
   - 두 번째 호출은 이미 `rejected` 상태라 실패해야 합니다.

4. completed 상태 반려 시도
   - `Completed withdraw request cannot be rejected` 오류로 실패해야 합니다.

5. canceled 등 기타 상태 반려 시도
   - `Only pending withdraw requests can be rejected` 오류로 실패해야 합니다.

6. 반려 후 withdraw 상태 확인

```sql
select *
from public.biz_withdraw_requests
where id = '출금요청_UUID';
```

7. 반려 후 ledger 변화 없음 확인

```sql
select *
from public.biz_balance_ledger
where withdraw_request_id = '출금요청_UUID';
```

8. 반려 후 업체 잔액 유지 확인

```sql
select *
from public.biz_company_balances
where company_id = '업체_UUID';
```

## biz_admin_logs 자동 기록

### 목표

관리자 RPC가 성공했을 때 처리 이력을 `biz_admin_logs`에 append-only로 기록합니다.

적용 대상 RPC:

- `approve_purchase_request`
- `complete_withdraw_request`
- `reject_withdraw_request`

중요 원칙:

- 성공 처리 후에만 로그를 남깁니다.
- 실패한 요청은 transaction rollback으로 로그가 남지 않습니다.
- `biz_admin_logs`는 update/delete 하지 않는 append-only 구조입니다.
- 기존 상태 변경, ledger 생성, 잔액 계산 로직은 유지합니다.

### 실제 insert 컬럼

현재 `biz_admin_logs` 스키마 기준 실제 컬럼명은 아래와 같습니다.

- `company_id`
- `admin_user_id`
- `target_table`
- `target_id`
- `action`
- `before_data`
- `after_data`
- `memo`

주의:

- 컬럼명은 `action_type`이 아니라 `action`입니다.
- `created_at`은 테이블 기본값 `now()`를 사용합니다.

### RPC별 action 값

#### approve_purchase_request

성공 시:

- `action`: `purchase_approved`
- `target_table`: `biz_purchase_requests`
- `target_id`: 승인한 purchase request id
- `company_id`: 매입신청의 company_id
- `admin_user_id`: 관리자 user id
- `memo`: `p_admin_memo`

`before_data` 예시:

```json
{
  "status": "pending",
  "approved_settlement_amount": null
}
```

`after_data` 예시:

```json
{
  "status": "approved",
  "approved_settlement_amount": 92000,
  "ledger_id": "..."
}
```

#### complete_withdraw_request

성공 시:

- `action`: `withdraw_completed`
- `target_table`: `biz_withdraw_requests`
- `target_id`: 처리완료한 withdraw request id
- `company_id`: 출금요청의 company_id
- `admin_user_id`: 관리자 user id
- `memo`: `p_admin_memo`

`before_data` 예시:

```json
{
  "status": "pending",
  "amount": 50000,
  "balance_before": 92000
}
```

`after_data` 예시:

```json
{
  "status": "completed",
  "amount": 50000,
  "balance_after": 42000,
  "ledger_id": "..."
}
```

#### reject_withdraw_request

성공 시:

- `action`: `withdraw_rejected`
- `target_table`: `biz_withdraw_requests`
- `target_id`: 반려한 withdraw request id
- `company_id`: 출금요청의 company_id
- `admin_user_id`: 관리자 user id
- `memo`: `p_admin_memo`

`before_data` 예시:

```json
{
  "status": "pending",
  "amount": 50000
}
```

`after_data` 예시:

```json
{
  "status": "rejected",
  "amount": 50000
}
```

### 테스트 확인 SQL

최근 관리자 로그 확인:

```sql
select *
from public.biz_admin_logs
order by created_at desc
limit 20;
```

매입 승인 로그 확인:

```sql
select *
from public.biz_admin_logs
where action = 'purchase_approved'
  and target_table = 'biz_purchase_requests'
  and target_id = '매입신청_UUID'
order by created_at desc;
```

출금 처리완료 로그 확인:

```sql
select *
from public.biz_admin_logs
where action = 'withdraw_completed'
  and target_table = 'biz_withdraw_requests'
  and target_id = '출금요청_UUID'
order by created_at desc;
```

출금 반려 로그 확인:

```sql
select *
from public.biz_admin_logs
where action = 'withdraw_rejected'
  and target_table = 'biz_withdraw_requests'
  and target_id = '출금요청_UUID'
order by created_at desc;
```

실패 요청 로그 미생성 확인:

```sql
select *
from public.biz_admin_logs
where target_id = '실패한_요청_UUID'
order by created_at desc;
```

### 실행 범위

Supabase SQL Editor에는 `supabase/seumbiz-rpc.sql`의 아래 함수 3개를 다시 실행합니다.

- `public.approve_purchase_request(uuid, numeric, text)`
- `public.complete_withdraw_request(uuid, text)`
- `public.reject_withdraw_request(uuid, text)`

각 함수는 `create or replace function`부터 해당 함수의 `grant execute`까지 한 덩어리로 실행합니다.

## create_manual_ledger_adjustment 설계

### 목표

관리자가 업체 잔액을 수동으로 증가 또는 차감합니다.

사용 예:

- 관리자 선지급
- 오입금 복구
- 중복 정산 회수
- 정산 보정
- 수수료 차감

중요 원칙:

- 모든 잔액 변화는 `biz_balance_ledger`에 기록합니다.
- ledger row는 update/delete 하지 않습니다.
- 관리자 처리 이력은 `biz_admin_logs`에 기록합니다.
- 잔액보다 큰 debit은 허용하지 않습니다.

### ledger_type 스키마 보완

초기 스키마에는 `manual_adjust`만 포함되어 있었으므로, 이번 RPC 실행 전 아래 ledger type을 허용해야 합니다.

- `manual_credit`
- `manual_debit`

`supabase/seumbiz-rpc.sql`에는 아래 보완 블록이 함께 포함되어 있습니다.

- 기존 `biz_balance_ledger_ledger_type_check` drop
- `manual_credit`, `manual_debit`을 포함한 CHECK 재생성
- `manual_credit`은 양수만 허용
- `manual_debit`은 음수만 허용

### 함수 시그니처

```sql
public.create_manual_ledger_adjustment(
  p_company_id uuid,
  p_adjustment_type text,
  p_amount numeric,
  p_reason text,
  p_admin_memo text default null
)
```

반환값:

- `company_id`
- `adjustment_type`
- `amount`
- `signed_amount`
- `current_balance_before`
- `current_balance_after`
- `ledger_id`

### 호출 권한

- 호출자는 로그인한 관리자여야 합니다.
- `biz_users.role = 'admin'`이어야 합니다.
- `biz_users.status = 'approved'`여야 합니다.
- 업체 사용자가 호출하면 실패해야 합니다.
- 비로그인/anon 호출은 실패해야 합니다.

권한 구문:

```sql
revoke all on function public.create_manual_ledger_adjustment(uuid, text, numeric, text, text) from public;
revoke all on function public.create_manual_ledger_adjustment(uuid, text, numeric, text, text) from anon;
grant execute on function public.create_manual_ledger_adjustment(uuid, text, numeric, text, text) to authenticated;
```

### 입력 검증

필수값:

- `p_company_id`
- `p_adjustment_type`
- `p_amount`
- `p_reason`

정책:

- `p_adjustment_type`은 `credit` 또는 `debit`만 허용합니다.
- `p_amount`는 0보다 커야 합니다.
- `p_reason`은 빈 문자열을 허용하지 않습니다.
- 대상 업체는 존재해야 합니다.
- 대상 업체의 `status`는 `approved`여야 합니다.

### 잔액 처리

현재 잔액 계산:

```sql
select coalesce(sum(amount), 0)
from public.biz_balance_ledger
where company_id = p_company_id;
```

처리 방식:

- `credit`: `biz_balance_ledger.amount = +p_amount`
- `debit`: `biz_balance_ledger.amount = -p_amount`

debit 정책:

- debit 처리 전 현재 잔액을 다시 계산합니다.
- 현재 잔액보다 큰 금액은 차감할 수 없습니다.

### ledger 기록

`biz_balance_ledger` insert:

- `company_id`: `p_company_id`
- `amount`: credit이면 양수, debit이면 음수
- `ledger_type`: credit이면 `manual_credit`, debit이면 `manual_debit`
- `reason`: `p_reason`
- `memo`: `p_admin_memo`
- `created_by`: 관리자 user id

### admin log 기록

`biz_admin_logs` insert:

- `company_id`: `p_company_id`
- `admin_user_id`: 관리자 user id
- `target_table`: `biz_balance_ledger`
- `target_id`: 생성된 ledger id
- `action`: credit이면 `manual_credit`, debit이면 `manual_debit`
- `before_data`: `current_balance_before`
- `after_data`: `current_balance_after`, `amount`, `ledger_id`, `reason`
- `memo`: `p_admin_memo`

### 테스트 호출 예시

credit 10,000:

```sql
select *
from public.create_manual_ledger_adjustment(
  '업체_UUID',
  'credit',
  10000,
  'manual credit test',
  'admin memo'
);
```

debit 5,000:

```sql
select *
from public.create_manual_ledger_adjustment(
  '업체_UUID',
  'debit',
  5000,
  'manual debit test',
  'admin memo'
);
```

### 테스트 시나리오

1. credit 10,000 성공
   - `biz_balance_ledger.ledger_type = 'manual_credit'`
   - `amount = 10000`
   - 업체 잔액 증가 확인

2. debit 5,000 성공
   - `biz_balance_ledger.ledger_type = 'manual_debit'`
   - `amount = -5000`
   - 업체 잔액 감소 확인

3. 잔액보다 큰 debit 실패
   - `amount exceeds current balance` 오류가 나야 합니다.

4. reason 빈값 실패
   - `reason is required` 오류가 나야 합니다.

5. 업체 계정 호출 실패
   - `Admin role required` 오류가 나야 합니다.

6. ledger 확인

```sql
select *
from public.biz_balance_ledger
where company_id = '업체_UUID'
  and ledger_type in ('manual_credit', 'manual_debit')
order by created_at desc;
```

7. admin log 확인

```sql
select *
from public.biz_admin_logs
where company_id = '업체_UUID'
  and action in ('manual_credit', 'manual_debit')
order by created_at desc;
```

8. 잔액 확인

```sql
select *
from public.biz_company_balances
where company_id = '업체_UUID';
```

### 실행 범위

Supabase SQL Editor에는 `supabase/seumbiz-rpc.sql`의 아래 범위를 실행합니다.

1. `manual_credit`, `manual_debit` 허용을 위한 `biz_balance_ledger` CHECK 보완 블록
2. `public.create_manual_ledger_adjustment(uuid, text, numeric, text, text)` 함수
3. 해당 함수의 `comment`, `revoke`, `grant` 구문

즉, `-- Required for manual ledger adjustment RPC.` 주석부터 `grant execute on function public.create_manual_ledger_adjustment...`까지 한 덩어리로 실행합니다.

## 실행 주의

- `supabase/seumbiz-rpc.sql`은 아직 실행하지 않습니다.
- 기존 `supabase/seumbiz-schema.sql`과 `supabase/seumbiz-rls.sql` 검토 후 실행해야 합니다.
- 기존 세움기프트 Supabase 프로젝트와 혼동하지 않아야 합니다.

## create_withdraw_request 설계

### 목표

업체 사용자가 업체 잔액 출금 신청을 하면 `biz_withdraw_requests`에 `pending` 상태로 저장합니다.

중요 원칙:

- 출금 신청 시점에는 `biz_balance_ledger`에 차감 로그를 만들지 않습니다.
- 업체 잔액 차감은 추후 `complete_withdraw_request` RPC에서 관리자 처리완료 시점에만 기록합니다.
- 출금 신청은 계좌정보를 저장하지 않습니다.

### 함수 시그니처

```sql
public.create_withdraw_request(
  p_amount numeric,
  p_memo text default null
)
```

반환값:

- `withdraw_request_id`
- `company_id`
- `amount`
- `current_balance`
- `status`

### 호출 권한

- 호출자는 로그인한 사용자여야 합니다.
- `biz_users.status = 'approved'`여야 합니다.
- `biz_users.role`은 `company_owner`, `company_staff`, `company_user` 중 하나여야 합니다.
- 연결된 `biz_companies.status = 'approved'`여야 합니다.
- admin 계정 호출은 실패하는 것이 정상입니다.
- `company_id`는 외부 입력으로 받지 않고 `auth.uid()` 기준 `biz_users.company_id`에서 내부 결정합니다.

권한 구문:

```sql
revoke all on function public.create_withdraw_request(numeric, text) from public;
revoke all on function public.create_withdraw_request(numeric, text) from anon;
grant execute on function public.create_withdraw_request(numeric, text) to authenticated;
```

### 금액 검증

정책:

- `p_amount`는 필수입니다.
- `p_amount`는 0보다 커야 합니다.
- 현재 잔액보다 큰 금액은 신청할 수 없습니다.

현재 잔액 계산:

```sql
select coalesce(sum(amount), 0)
from public.biz_balance_ledger
where company_id = 현재_업체_ID;
```

주의:

- pending 출금 신청은 잔액을 차감하지 않습니다.
- 따라서 pending 신청 금액은 ledger 잔액에서 자동 차감되지 않습니다.
- 최종 처리 단계인 `complete_withdraw_request`에서도 잔액을 다시 검증해야 합니다.

### 생성되는 데이터

성공 시 `biz_withdraw_requests`에 아래 값으로 1건을 생성합니다.

- `company_id`: 로그인 사용자의 업체 ID
- `requested_by`: 로그인 사용자 ID
- `amount`: 신청 금액
- `status`: `pending`
- `memo`: 업체 입력 메모

생성하지 않는 데이터:

- `biz_balance_ledger` 차감 로그
- 계좌정보
- 관리자 처리정보

### 테스트 호출 예시

정상 출금 신청:

```sql
select *
from public.create_withdraw_request(
  50000,
  'withdraw request test'
);
```

잔액 초과 실패 예시:

```sql
select *
from public.create_withdraw_request(
  100000,
  'exceeds balance test'
);
```

### 테스트 시나리오

1. 업체 사용자가 50,000원 출금 신청 성공
   - `biz_withdraw_requests.status = 'pending'`
   - `amount = 50000`
   - `requested_by = 현재 로그인 사용자와 연결된 biz_users.id`

2. 현재 잔액 92,000원보다 큰 100,000원 신청 실패
   - `amount exceeds current balance` 오류가 나야 합니다.

3. admin 계정 호출 실패
   - `Approved company user not found` 오류가 나야 합니다.

4. 비로그인 호출 실패
   - `Authentication required` 오류가 나야 합니다.

5. 신청 성공 후 확인

```sql
select *
from public.biz_withdraw_requests
where requested_by = (
  select id
  from public.biz_users
  where login_id = 'test@test.com'
)
order by created_at desc;
```

6. 신청 직후 ledger 차감 기록 없음 확인

```sql
select *
from public.biz_balance_ledger
where company_id = '업체_UUID'
order by created_at desc;
```

7. 신청 직후 업체 잔액 유지 확인

```sql
select *
from public.biz_company_balances
where company_id = '업체_UUID';
```

### 아직 처리하지 않는 것

- 관리자 처리완료
- `withdraw_completed` ledger 차감 로그
- 반려 처리
- 취소 처리
- 카카오톡 안내 연동
- 계좌정보 저장

위 항목은 다음 RPC에서 별도로 설계합니다.
