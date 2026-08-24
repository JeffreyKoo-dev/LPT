# LPT Phase 2 — 회원제 전환 설계도

버전: 초안 1.0
목적: 요청된 12개 기능을 실제로 만들 수 있는 순서로 쪼개고, DB/아키텍처/개인정보
정책을 먼저 확정한다. 이 문서에서 결정된 내용을 바탕으로 이후 실제 코드를 붙여나간다.

---

## 1. 요청 기능 12개 분류

| # | 기능 | 백엔드 필요? | Phase |
| --- | --- | --- | --- |
| 11 | 음력 계산(생일 표시) | 불필요 | 2a |
| 12 | 두 명의 LPT 궁합 분석 | 불필요 (1회성 계산) | 2a |
| 2 | 카톡/문자/인스타/페북 공유 | 불필요 (OS 공유시트) | 2a |
| 3 | 분석결과 요약 이미지 카드 공유 | 불필요 (이미 일부 구현됨) | 2a |
| 1 | 회원 관리 + 36문항 응답 저장 | **필요** | 2b |
| 10 | 생년월일시 비저장 정책 + 익명 통계 DB | **필요** | 2b |
| 4 | 지인과의 궁합 분석(계정 연동) | 필요 (친구 목록) | 2c |
| 5 | 같은 성향 지인 리스트 | 필요 | 2c |
| 6 | 맞는 성향 추천 | 필요 (또는 정적 데이터로 2a 가능) | 2a/2c |
| 7 | 안 맞는 성향 추천 | 필요 (또는 정적 데이터로 2a 가능) | 2a/2c |
| 8 | 만세력 기반 오늘의 추천(퀘스트/점심/사람) | 필요 (사람 추천은 지인 DB 필요) | 2d |
| 9 | 오늘의 추천 쇼핑(PPL 수익화) | 필요 (상품 DB, 결제/제휴 연동은 별도) | 2d |

**Phase 2a**부터 바로 착수 가능 (백엔드 없이 오늘 코드 작업 가능)
**Phase 2b**는 Supabase 프로젝트 생성이 선행 조건
**Phase 2c, 2d**는 2b 위에서 이어감

---

## 2. 아키텍처 결정

### 2.1 백엔드 구성: Supabase 직접 연동 (FastAPI 없이 시작)

프로필에 있는 선호 스택은 FastAPI + Supabase + Next.js이지만, 이번 기능 목록
(회원, 저장, 궁합 계산, 추천 조회)은 **Supabase의 Postgres + Row Level
Security(RLS) + Edge Function만으로 전부 커버 가능**하다. 추천 로직이 복잡해지는
Phase 2d에서 별도 서버가 필요해지면 그때 FastAPI를 EC2에 추가로 올리는 걸
권장한다 (지금 단계에서 미리 만들면 유지보수 지점만 늘어남).

```
[Next.js (EC2, 기존)] ──직접 호출──> [Supabase: Auth + Postgres + Edge Functions]
```

### 2.2 인증 방식

- Supabase Auth 사용. 방법은 **이메일 OTP(매직링크) 또는 카카오 소셜 로그인** 중 택1로 시작
- 카카오 소셜 로그인을 쓰려면 [Kakao Developers](https://developers.kakao.com)에 앱 등록 + REST API 키 필요 (본인 확인 필요)
- 비밀번호 로그인은 권장하지 않음 (분실 문의 등 운영 부담)

### 2.3 로컬 데이터 → 서버 데이터 전환 전략

기존 LocalStorage 로직(`lib/storage.ts`)은 `LptStorage` 인터페이스로
추상화되어 있어, 로그인한 사용자는 이 인터페이스의 구현체만 Supabase 버전으로
바꿔 끼우면 된다. **비로그인 사용자는 지금처럼 LocalStorage로 계속 체험 가능**
(가입 장벽 없이 먼저 써보고 나중에 저장하고 싶으면 가입 유도).

---

## 3. 개인정보 정책 (요청 10번) — 데이터 흐름 설계

### 원칙
> 생년월일시는 회원 정보(계정)와 절대 연결해서 저장하지 않는다.

### 구체적 흐름

1. 사용자가 `/start`에서 생년월일시를 입력하면, **지금처럼 브라우저에서 사주를
   계산**한다 (서버로 생년월일시 원본이 전송되지 않음).
2. 계산이 끝나면, **회원 계정에는 계산 결과(LPT 유형, 오행 등 "가공된 결과")만
   저장**한다. 생년월일시 원본은 `users`/`user_profiles` 테이블 어디에도
   존재하지 않는다.
3. (선택 동의) 통계 목적으로, **계정과 무관한 별도 테이블**에 "생년월일시 +
   성별 + 계산된 LPT 유형"만 이름·닉네임·계정ID 없이 저장한다. 이 테이블은
   집계 통계(예: "이 유형은 몇 월생이 많은지") 용도로만 쓰고, 개별 사용자를
   역추적할 수 있는 연결고리를 코드 레벨에서 원천 차단한다.
4. 이용약관/개인정보처리방침에 위 흐름을 그대로 명시한다 (실제 문구는 법무
   검토 필요 — 이 문서는 기술 설계까지만 다룸).

### 스키마 초안

```sql
-- 회원 계정 (Supabase Auth의 auth.users와 1:1 연결)
create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  lpt_type_id text not null,        -- 계산 "결과"만 저장
  xp integer not null default 0,
  stats jsonb not null default '{}',
  badges text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 생년월일시, 출생시간, 성별 컬럼 없음 (의도적)

-- 36문항 응답 (결과 재계산/이력 확인용)
create table survey_responses (
  user_id uuid references auth.users(id) on delete cascade,
  answers jsonb not null,           -- [{questionId, value}, ...]
  computed_at timestamptz not null default now(),
  primary key (user_id)
);

-- 익명 통계 전용 (계정과 연결고리 없음)
create table birth_stats (
  id bigint generated always as identity primary key,
  birth_date date not null,
  birth_time time,                  -- 모르면 null
  gender text not null,
  calendar_type text not null,
  lpt_type_id text not null,
  created_at timestamptz not null default now()
  -- user_id, nickname 등 식별 컬럼 없음 (의도적)
);
```

`birth_stats` 테이블에 대한 RLS 정책은 **insert만 허용, select는 서버(관리자
역할)에서만** 가능하도록 잠가서, 클라이언트가 실수로라도 이 데이터를 다시
읽어 특정 유저와 연결짓지 못하게 막는다.

---

## 4. Phase 2a 상세 설계 (백엔드 없이 지금 착수)

### 4.1 음력 계산 표시 (#11)
- `saju-engine`에 이미 있는 `solarToLunar()` 활용
- `/result` 캐릭터 카드 또는 기본 정보 요약에 "음력 O월 O일生" 한 줄 추가

### 4.2 두 명의 LPT 궁합 분석 (#12)
- 새 페이지 `/compatibility` (가칭): 본인 결과 + 상대방 생년월일시(비로그인, 그
  자리에서만 계산, 저장 안 함) 입력 → 두 사주/유형 비교
- 궁합 로직 설계 방향: 두 사람의 오행 상생상극 관계 + 행동 스타일(추진/확장/설계/탐색)
  궁합 매트릭스로 산출 (LPT 12유형 x 12유형 = 144가지 조합 매트릭스를
  `data/compatibility.ts`로 미리 정의)
- 표현 원칙 동일 적용: "궁합" 대신 기존처럼 "관계 적합도" 용어 사용, 단정적 표현 금지

### 4.3 공유 기능 확장 (#2, #3)
- `navigator.share()` (Web Share API)로 OS 기본 공유시트 호출 → 카카오톡/인스타그램/
  페이스북/문자 앱이 설치돼 있으면 자동으로 목록에 뜸 (플랫폼별 SDK/앱키 불필요)
- 미지원 브라우저(주로 데스크톱)는 기존 "링크 복사" 버튤으로 폴백
- 카카오톡에 **리치 카드(썸네일+제목+버튼)** 형태로 보내고 싶다면 별도로 카카오
  JS SDK + 앱키 등록이 필요 (선택 사항, 없어도 이미지 공유 자체는 가능)

### 4.4 성향 추천/비추천 (#6, #7 — 정적 버전)
- 지인 DB 없이도, **LPT 유형 간 궁합 매트릭스**(4.2에서 만드는 것 재사용)를 이용해
  "이런 유형과는 대체로 잘 맞는 경향" / "이런 부분은 서로 다른 방식이라 노력이
  필요할 수 있음" 형태로 `/result`에 정적으로 추가 가능
- 특정 지인과 비교하는 버전(진짜 개인화)은 Phase 2c에서 로그인 연동 후 처리

---

## 5. Phase 2b 상세 설계 (Supabase 세팅 후)

1. Supabase 프로젝트 생성, 위 스키마 마이그레이션 적용
2. Supabase Auth 연동 (이메일 OTP 또는 카카오 로그인)
3. `lib/storage.ts`의 `LptStorage` 구현체를 Supabase 버전으로 추가 (로그인 시
   자동 전환, 비로그인 시 기존 LocalStorage 유지)
4. `/start` 제출 시 (동의한 경우에만) `birth_stats`에 익명 insert 별도 호출 추가
5. 로그인/회원가입 화면(`/login`, `/signup` 또는 통합 `/auth`) 신규 제작

---

## 6. 다음에 정해야 할 것 (열린 질문)

- [ ] 로그인 방식: 이메일 OTP만? 카카오 소셜 로그인도 포함?
- [ ] 카카오 로그인/공유 SDK를 쓴다면 Kakao Developers 앱 등록 및 REST API 키 필요 — 준비 가능하신가요?
- [ ] 궁합 분석 결과를 서버에 저장할지(이력 조회 가능), 매번 그 자리에서만 계산하고 버릴지
- [ ] #9 쇼핑 추천의 실제 상품 데이터 소스 — 직접 큐레이션? 쿠팡파트너스 등 제휴 API 연동?
- [ ] 익명 통계(`birth_stats`) 수집에 대한 사용자 동의 UI 문구/체크박스 필요 (법무 검토 권장)

---

## 7. Phase 2a 구현 완료 내역 (백엔드 없이 구현됨)

- `/result` 페이지에 음력 생일 표시 (`lib/saju.ts`의 `getLunarDate()`)
- `/compatibility` 신규 페이지 — 상대방 생년월일시를 입력받아(저장 안 함) 오행 상생상극
  기반 관계 적합도를 그 자리에서 계산 (`lib/compatibility.ts`)
- `/result`에 정적 "유형별 관계 적합도" 패널 — 지인 정보 없이도 행동 스타일
  4분면 기반으로 보완형/대각형 유형 안내 (`RelatedTypesPanel`)
- `ShareActions`에 Web Share API(`navigator.share`) 연동 — 지원 기기에서 OS
  기본 공유시트로 카카오톡·인스타그램·페이스북·문자 등에 바로 공유 가능
  (플랫폼별 SDK·앱키 불필요, 이미지 카드 자동 첨부 시도 후 실패 시 링크로 폴백)

**남은 것 (Phase 2b~2d)**: 회원 관리, 서버 저장, 지인 연동 궁합·같은 성향 리스트,
만세력 기반 오늘의 추천, 쇼핑 추천(PPL) — Supabase 프로젝트 생성 이후 진행.

---

## 8. Phase 2b 세팅 가이드 (Supabase 연결)

### 8.1 스키마 적용
1. Supabase 대시보드 → 프로젝트 → **SQL Editor**
2. `supabase/schema.sql` 파일 내용을 그대로 붙여넣고 실행 (테이블 3개 + RLS 정책 생성)

### 8.2 환경변수 설정
1. `.env.local.example`을 복사해 `.env.local` 생성
2. Supabase 대시보드 → **Project Settings → API**에서 `Project URL`과 `anon public` 키 확인
3. `.env.local`에 채워넣기:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. **EC2 서버에도 동일하게** `~/lpt/.env.local` 파일을 직접 만들어야 함 (git에는 안 올라가므로 로컬에서 파일 내용을 복사해서 서버에 붙여넣기)
5. 값을 바꾼 뒤에는 반드시 `npm run build`를 다시 해야 반영됨 (Next.js는 `NEXT_PUBLIC_*` 값을 빌드 시점에 번들에 굽는다)

### 8.3 이메일 로그인
- Supabase는 기본 내장 이메일 발송 기능이 있어 별도 설정 없이 바로 동작 (다만 발신자가 Supabase 도메인이라 스팸함으로 갈 수 있음 — 실 서비스 전환 시 커스텀 SMTP 연결 권장)

### 8.4 카카오 로그인 설정
1. [Kakao Developers](https://developers.kakao.com) → 애플리케이션 추가
2. **제품 설정 → 카카오 로그인** 활성화
3. **Redirect URI**에 Supabase 콜백 주소 등록: `https://<프로젝트ref>.supabase.co/auth/v1/callback`
4. 앱 설정에서 **REST API 키**, **Client Secret**(보안 → Client Secret 발급) 확인
5. Supabase 대시보드 → **Authentication → Providers → Kakao** 활성화 후 위 REST API 키(Client ID)와 Client Secret 입력
6. Supabase 대시보드 → **Authentication → URL Configuration**에서 `Site URL`을 실제 서비스 주소(`http://3.36.50.191` 또는 도메인)로 설정

### 8.5 새로 추가된 코드
- `src/lib/supabase/client.ts` — 브라우저 Supabase 클라이언트 (환경변수 없으면 안전하게 비활성화됨)
- `src/lib/useSupabaseSession.ts` — 로그인 상태 구독 훅
- `src/app/login/page.tsx` — 이메일 OTP + 카카오 로그인 화면
- `supabase/schema.sql` — DB 스키마 (user_profiles, survey_responses, birth_stats)
- 헤더에 로그인 상태 표시 (환경변수 미설정 시 자동으로 숨김)

**아직 안 된 것**: 실제 로그인 후 LocalStorage 데이터를 Supabase로 저장하는 연동
(`lib/storage.ts`의 Supabase 어댑터), `birth_stats` 익명 통계 저장 로직. 환경변수
연결과 로그인 테스트가 끝나면 이어서 진행.
