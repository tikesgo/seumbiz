# 세움Biz 테스트 데이터 준비 계획

이 문서는 `create_purchase_request` RPC 테스트를 위한 테스트 업체, 테스트 사용자, Supabase Auth 연결 준비 절차입니다. 현재 단계에서는 설계만 작성하며 Supabase에는 실행하지 않습니다.

## 목표

`create_purchase_request` RPC가 아래 흐름대로 동작하는지 확인합니다.

1. 승인된 업체 사용자만 호출 가능
2. `auth.uid()` 기준으로 `biz_users.auth_user_id` 조회
3. `biz_users.company_id` 기준으로 업체 결정
4. `biz_purchase_requests` 생성
5. `biz_purchase_items` 생성
6. `item_count`, `total_face_value`, `expected_settlement_amount` 계산
7. 잘못된 입력은 전체 rollback

## 1. 테스트 업체 생성 절차

테스트 업체는 `biz_companies`에 생성합니다.

필수 조건:

- `status = 'approved'`
- `default_rate` 설정
- `company_name`, `manager_name`, `phone` 입력

예시 값:

- 업체명: `세움Biz 테스트업체`
- 담당자명: `테스트 담당자`
- 연락처: `010-0000-0000`
- 카카오톡 ID: `seumbiz_test`
- 기본 요율: `90.00`
- 상태: `approved`

주의:

- `create_purchase_request`는 업체 상태가 `approved`가 아니면 실패해야 합니다.
- `company_id`는 테스트 사용자 생성 시 필요합니다.

## 2. 테스트 사용자 생성 절차

테스트 사용자는 Supabase Auth 사용자와 `biz_users` row를 함께 준비해야 합니다.

필수 조건:

- `biz_users.auth_user_id = auth.users.id`
- `biz_users.company_id = 테스트 업체 id`
- `role in ('company_owner', 'company_staff', 'company_user')`
- `status = 'approved'`

예시 값:

- 로그인 ID: `seumbiz_test_user`
- 이름: `테스트 사용자`
- 역할: `company_owner`
- 상태: `approved`

주의:

- `role = 'admin'` 계정은 `create_purchase_request` 호출 실패가 정상입니다.
- 미승인 사용자 `status = 'pending'` 또는 `suspended`는 호출 실패가 정상입니다.

## 3. Auth uid와 biz_users.auth_user_id 연결 방식

`create_purchase_request`는 내부에서 `auth.uid()`를 사용합니다.

따라서 테스트 사용자는 아래 관계를 반드시 만족해야 합니다.

```text
auth.users.id = public.biz_users.auth_user_id
```

준비 순서:

1. Supabase Auth에서 테스트 사용자를 생성합니다.
2. 생성된 Auth user의 UUID를 확인합니다.
3. `biz_users.auth_user_id`에 같은 UUID를 넣어 row를 생성하거나 기존 row를 연결합니다.
4. `biz_users.id`는 내부 FK용 row ID로 유지합니다.
5. `biz_users.company_id`는 테스트 업체의 `biz_companies.id`로 연결합니다.

확인 포인트:

- Supabase SQL Editor에서 수동 테스트할 경우 실제 로그인 세션의 `auth.uid()`가 없을 수 있습니다.
- RPC 테스트는 Supabase client 또는 API 호출처럼 인증된 사용자 JWT가 있는 환경에서 하는 것이 정확합니다.
- SQL Editor에서 service role 또는 dashboard owner로 직접 실행하면 `auth.uid()`가 기대와 다를 수 있으므로 주의합니다.

## 4. approved 상태 설정 방법

테스트 성공 조건:

- `biz_companies.status = 'approved'`
- `biz_users.status = 'approved'`
- `biz_users.role = 'company_owner'`, `company_staff`, `company_user` 중 하나

실패 테스트용 상태:

- 업체 `pending`: 실패해야 함
- 업체 `suspended`: 실패해야 함
- 사용자 `pending`: 실패해야 함
- 사용자 `suspended`: 실패해야 함
- 사용자 `admin`: 실패해야 함

## 5. RPC 호출 순서

사전 실행 순서:

1. `supabase/seumbiz-schema.sql` 실행
2. `supabase/seumbiz-rls.sql` 실행
3. `supabase/seumbiz-rpc.sql` 실행
4. 테스트 업체 생성
5. Supabase Auth 테스트 사용자 생성
6. Auth UUID를 `biz_users.auth_user_id`에 연결
7. 인증된 테스트 사용자 세션으로 RPC 호출

정상 호출 예시:

```sql
select *
from public.create_purchase_request(
  '컬쳐랜드',
  '[{"pin_no":"2300000000000000","face_value":100000}]'::jsonb,
  '테스트 접수'
);
```

주의:

- 위 SQL은 호출 형태 예시입니다.
- 실제 권한 테스트는 인증된 업체 사용자 JWT로 호출해야 합니다.

## 6. 성공 시 확인 항목

`biz_purchase_requests` 확인:

- 1건 생성
- `company_id`가 테스트 업체 id와 일치
- `requested_by`가 테스트 사용자 id와 일치
- `receipt_no`가 `BIZ-YYYYMMDD-0001` 형식
- `giftcard_type = '컬쳐랜드'`
- `item_count = 1`
- `total_face_value = 100000`
- `applied_rate = 테스트 업체 default_rate`
- `expected_settlement_amount = floor(total_face_value * applied_rate / 100)`
- `status = 'pending'`

`biz_purchase_items` 확인:

- 같은 `purchase_request_id`로 1건 생성
- `company_id`가 테스트 업체 id와 일치
- `giftcard_type = '컬쳐랜드'`
- `pin_no = '2300000000000000'`
- `face_value = 100000`
- `status = 'pending'`

원장 확인:

- `biz_balance_ledger`에는 아직 생성되는 로그가 없어야 합니다.
- 매입 승인 전에는 업체 잔액이 증가하지 않아야 합니다.

## 7. 실패 시 확인 항목

입력값 실패:

- `p_items = []`: 실패
- `pin_no` 누락: 실패
- `pin_no` 빈 문자열: 실패
- `face_value` 누락: 실패
- `face_value = 0`: 실패
- `face_value < 0`: 실패
- `ocr_confidence < 0`: 실패
- `ocr_confidence > 100`: 실패
- `p_giftcard_type` 빈 문자열: 실패

권한 실패:

- 비로그인/anon 호출: 실패
- `biz_users.auth_user_id`와 `auth.uid()` 불일치: 실패
- `biz_users.status != 'approved'`: 실패
- `biz_companies.status != 'approved'`: 실패
- `biz_users.role = 'admin'`: 실패
- `biz_users.role`이 허용 목록 밖인 경우: 실패

데이터 무결성 확인:

- 실패한 호출 후 `biz_purchase_requests`가 생성되지 않아야 합니다.
- 실패한 호출 후 `biz_purchase_items`가 생성되지 않아야 합니다.
- 실패한 호출 후 `biz_balance_ledger`가 생성되지 않아야 합니다.

## 다음 단계

- 테스트 업체/사용자 생성 SQL 초안 작성
- Supabase Auth 테스트 계정 생성 절차 확정
- 실제 RPC 호출 방식 결정
- `approve_purchase_request` RPC 설계
