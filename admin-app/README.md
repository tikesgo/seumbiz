# 세움기프트 V2 관리자

고객용 사이트와 분리된 별도 관리자 앱입니다. 기존 Supabase `orders` 테이블을 읽고 `status` 값을 업데이트합니다.

## 실행

1. `.env.local.example`을 참고해 `.env.local`을 만듭니다.
2. Supabase URL, anon key, service role key, 관리자 비밀번호를 입력합니다.
3. 아래 명령으로 실행합니다.

```bash
npm run dev
```

관리자 화면은 `http://localhost:4173/admin`에서 열립니다.
