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

---

## 9. Phase 2b 완료 — 로그인 사용자 데이터 클라우드 동기화

**설계**: LocalStorage가 항상 우선(빠르고 오프라인 동작)이고, 로그인 상태일
때만 백그라운드로 Supabase에도 반영한다. 저장 함수의 시그니처(동기 함수)는
그대로 유지하면서, 내부에서 비동기 클라우드 푸시를 fire-and-forget으로
호출하는 방식이라 기존 코드 대부분을 건드리지 않았다.

**추가된 파일**
- `src/lib/supabase/authState.ts` — 로그인 상태를 메모리에 캐싱해, 일반 함수
  (React 훅이 아닌 lib 함수)에서도 동기적으로 로그인 여부를 확인
- `src/lib/supabase/sync.ts` — `pushGrowthProfileToCloud`, `pushSurveyToCloud`,
  `pullAndMergeOnLogin`
- `src/components/common/AuthSync.tsx` — 레이아웃에 항상 마운트되어, 로그인이
  감지되면 1회 클라우드↔로컬 동기화를 실행하는 보이지 않는 컴포넌트

**동작 방식**
1. 퀘스트 완료·레벨업 등으로 `saveGrowthProfile()`이 호출될 때마다, 로그인
   상태면 `user_profiles`에 업서트
2. 36문항 설문을 완료(마지막 문항 응답)하면 `survey_responses`에 업서트
   (문항마다 올리지 않고 완료 시점에만 — 불필요한 네트워크 호출 방지)
3. 로그인 직후: 클라우드에 데이터가 있으면 로컬에 가져와 덮어쓰기(다른 기기에서
   이어보기), 클라우드가 비어있고 로컬에 데이터가 있으면 로컬 진행 상황을
   클라우드로 업로드(이 기기에서의 첫 로그인)

**의도적으로 동기화하지 않는 것**: 생년월일시·성별(`BasicInfo`)과 사주 계산
결과(`AnalysisReport`의 `sajuChart`)는 원본 개인정보이거나 그로부터 바로
계산되는 값이라 클라우드에 올리지 않는다. 새 기기에서 로그인하면 성장
기록(XP·스탯·뱃지·퀘스트 이력)과 설문 응답은 복원되지만, 결과 리포트(`/result`)를
보려면 그 기기에서 생년월일시를 다시 입력해야 한다 — 개인정보 정책(3절)에
따른 의도된 동작이다.

**검증**: 비로그인/환경변수 미설정 상태에서 모든 push 함수가 에러 없이
조용히 무시되는 것, 기존 퀘스트 완료→레벨업→뱃지 파이프라인이 그대로
정상 동작하는 것을 확인했다. 실제 로그인 상태에서의 업로드/복원 테스트는
실제 Supabase 프로젝트가 필요해 배포 후 확인이 필요하다.

**남은 것**: `birth_stats` 익명 통계 저장 로직 (동의 UI 포함), `/quests/[id]`
페이지가 퀘스트 완료 시 호출하는 `completeQuest()`는 이미 내부적으로
`saveGrowthProfile()`을 거치므로 별도 수정 없이 자동으로 클라우드 동기화된다.

---

## 10. 성장 기능 로그인 필수화

**결정**: `/start`, `/survey`, `/result`(분석 체험)는 비로그인으로도 계속
가능하지만, `/dashboard`, `/quests`, `/quests/[id]`, `/badges`, `/growth`
(성장 기록·퀘스트 진행)는 **로그인이 필수**로 바뀌었다. 로그인 안 된 상태로
접근하면 `/login?redirect=<원래경로>`로 자동 이동하고, 로그인 완료 후 원래
가려던 페이지로 돌아간다.

**구현**: `src/lib/useRequireLogin.ts` — `useSupabaseSession()`을 감싸서,
Supabase가 설정되어 있는데 로그인 상태가 아니면 리다이렉트한다. Supabase 자체가
설정 안 된 환경(로컬 개발 등)에서는 막지 않고 기존처럼 통과시켜, 로그인 기능
없이 개발/테스트하던 흐름을 깨지 않는다. `useGrowthSession()`을 쓰는 5개
페이지 각각에 이 훅을 추가했다 (공유 카드 `/share/[id]`와 `/compatibility`는
비로그인으로도 계속 열람 가능하도록 의도적으로 제외).

**로그인 페이지 개선**: `?redirect=` 쿼리 파라미터를 지원해, 로그인 방식(이메일
OTP·카카오 OAuth) 모두 로그인 완료 후 원래 페이지로 정확히 돌아가도록 했다.
안전하지 않은 리다이렉트 경로(외부 URL 등)는 `/dashboard`로 기본 처리해
open redirect를 방지했다.

---

## 11. birth_stats 익명 통계 저장 완료 (Phase 2b 마무리)

**구현**: `/start` 페이지 맨 아래에 기본 비동의(옵트인) 체크박스 추가 —
"익명 통계 목적으로 결과 데이터 제공에 동의합니다". 동의한 경우에만
`generateAndSaveAnalysisReport()`가 실행될 때(설문 완료 시점) `lib/supabase/sync.ts`의
`pushAnonymousBirthStats()`가 `birth_stats` 테이블에 생년월일시·성별·계산된
유형만 저장한다.

**계정과의 분리를 코드로 보장하는 방법**:
- `pushAnonymousBirthStats()`는 로그인 여부를 아예 확인하지 않는다 (로그인
  여부와 무관하게 동의만으로 동작) — user_id를 참조할 방법 자체가 없다
- 삽입하는 컬럼에 `nickname`, `user_id` 등 식별 가능한 값이 전혀 없다
- `supabase/schema.sql`의 `birth_stats` RLS 정책은 **insert만 허용**, select는
  클라이언트에서 불가능하도록 막아뒀다 (관리자만 대시보드에서 직접 조회 가능)

**검증**: 미동의/동의 두 경우 모두, 그리고 Supabase 미설정 환경에서 안전하게
동작하는 것(에러 없이 조용히 무시)을 확인했다.

**Phase 2b 전체 완료**: Supabase 연동, 로그인(이메일 코드·카카오), 클라우드
동기화, 성장 기능 로그인 필수화, 익명 통계 저장까지 모두 마무리됐다. 다음은
Phase 2c(지인 연동 궁합, 같은 성향 리스트)로 이어간다.

---

## 12. Phase 2c — 지인 연동 궁합·같은 성향 리스트 완료

**설계**: 검색으로 다른 사용자를 찾는 기능은 넣지 않았다. 본인이 초대
링크를 만들어 공유하고, 상대방이 로그인 상태로 그 링크를 열어 수락해야만
친구가 되는 방식이다 (`friendships` 테이블, `supabase/migrations/002_friendships.sql`).

**궁합 계산 방식**: 서버에는 생년월일시 원본이 아니라 계산된 LPT 유형만
저장되어 있으므로, 친구 목록에서의 궁합은 `lib/compatibility.ts`의
`computeTypeCompatibility()`로 두 사람의 **행동 스타일(quadrant)과 에너지
그룹만으로** 계산한다 — `/compatibility`의 오행 기반 정밀 계산보다는 근사치이며,
정밀한 결과를 원하면 여전히 `/compatibility`에서 생년월일시를 직접 입력해야
한다 (친구 카드에 안내 링크 포함). 144가지 유형 조합 전수 계산을 직접
실행해 검증했다.

**같은 성향 표시**: 친구 목록에서 나와 LPT 유형이 같은 친구에게 "같은 성향"
배지를 표시한다.

**새로 추가된 것**
- `supabase/migrations/002_friendships.sql` — `friendships` 테이블 + RLS.
  친구 사이에는 서로의 `user_profiles`(닉네임·유형·성장기록)를 조회할 수
  있도록 정책을 추가했다 (기존 "본인만 조회" 정책에 OR로 합쳐짐)
- `lib/friends.ts` — 초대 생성/조회/수락, 친구 목록 조회
- `/friends` — 친구 목록 + 초대 링크 생성(Web Share API 연동)
- `/friends/accept/[code]` — 초대 수락 화면 (로그인 필수)
- `components/friends/FriendCard.tsx` — 친구별 유형·궁합 요약 카드

**Phase 2 전체 요약**: 2a(음력·궁합·공유·정적유형궁합) → 2b(Supabase·로그인·
클라우드동기화·로그인필수화·익명통계) → 2c(친구·지인궁합·같은성향) 순서로
모두 완료됐다.

---

## 13. Phase 2d 완료 — 오늘의 추천(퀘스트·점심·만날 사람·쇼핑)

**구현**: `/dashboard` 상단에 "오늘의 추천" 패널 하나로 4가지를 묶어서
보여준다 (`components/dashboard/TodayRecommendationPanel.tsx`).

- **오늘의 퀘스트**: 미완료 퀘스트 중 캐릭터 대표 스탯과 맞는 것 우선,
  날짜를 시드로 결정론적으로 하나 선택 (`lib/dailyRecommendation.ts`의
  `getDailyQuest()`) — 모두 완료했으면 안내 문구로 대체
- **오늘의 점심**: 사주 오행(오늘 기준 최다 오행)에 맞춰 `data/dailyLunch.ts`에서
  날짜 시드로 순환 노출
- **오늘 만나면 좋을 사람**: 친구 목록 중 `computeTypeCompatibility()` 점수가
  가장 높은 친구를 추천(동점이면 날짜로 순환). 친구가 없으면 `/friends`로
  안내하는 링크 표시
- **오늘의 추천 아이템**: `data/shoppingItems.ts`에서 오행별로 큐레이션한
  콘텐츠를 날짜 시드로 순환 노출

**쇼핑(수익화) 관련 설계 결정**: 실제 제휴 API(쿠팡파트너스 등) 연동은 아직
하지 않았다. `ShoppingItem.affiliateUrl`을 비워두면 UI가 자동으로 "둘러보기
링크 준비 중"으로 표시되고, 실제 제휴 계정이 준비되면 `data/shoppingItems.ts`의
이 필드만 채우면 코드 변경 없이 바로 노출된다.

**검증**: 점심/쇼핑이 오행별로 다르게 나오고 날짜가 바뀌면 순환하는 것,
퀘스트가 미완료 항목 중에서만 뽑히는 것, 친구 추천이 실제로 궁합 점수가
가장 높은 사람을 정확히 골라내는 것(보완형 80점 vs 동형 68점 케이스로 확인)을
직접 실행해 검증했다.

---

## Phase 2 전체 완료

요청했던 12개 기능 중 12개 모두 구현이 끝났다 (1~12번). 남은 것은 실제
운영 단계에서 결정할 사항들 (제휴 API 연동, 이메일 커스텀 SMTP, Next.js
14→16 업그레이드 검토 등)뿐이다.

---

## 14. 공유 기능 재설계 — Web Share API 의존 제거

**문제**: Web Share API(`navigator.share`)가 실기기(안드로이드, 크롬 게스트
모드 포함)에서 "다시 시도하세요. 공유할 수 있는 일부 방법만 표시됩니다"라는
경고와 함께 공유 대상 앱 목록이 거의 비어버리는 문제가 재현됐다. 파일 첨부
제거, url 단독 공유 등 여러 단계로 축소해봤지만 동일 기기·게스트 모드에서도
재현되어, 기기/브라우저의 Sharesheet 자체 이슈로 판단하고 접근 방식을
바꿨다.

**해결**: 하나의 API에 기대지 않고, 플랫폼별로 독립적인 방식의 버튼을
따로 만들었다.

- **카카오톡**: Kakao Share SDK(`lib/kakaoShare.ts`) — 카카오 로그인과는
  별개 기능이라 Kakao Developers에서 **"카카오톡 공유" 제품을 별도로 활성화**하고
  **JavaScript 키**를 발급받아야 한다 (REST API 키와 다른 키). `.env.local`에
  `NEXT_PUBLIC_KAKAO_JS_KEY`가 없으면 버튼 자체가 자동으로 숨겨진다.
- **페이스북·X(트위터)·문자**: SDK나 앱키 없이, 각 서비스가 공식 제공하는
  URL 형식으로 새 창을 여는 방식(`lib/shareLinks.ts`) — 100% 안정적으로
  동작한다.
- **Web Share API**: "기타 앱으로 공유"라는 보조 버튼으로 격하해 남겨뒀다
  (지원 기기에서는 여전히 시도해볼 수 있게).

**Kakao Share SDK 설정 방법** (카카오 로그인과는 별개로 추가 설정 필요):
1. Kakao Developers → 해당 앱 → 제품 설정 → **카카오톡 공유** → 활성화 ON
2. 앱 설정 → 앱 키 → **JavaScript 키** 복사
3. 앱 설정 → 플랫폼 → **Web 플랫폼**에 실제 서비스 도메인 등록
   (예: `https://questofme.com`)
4. `.env.local`에 `NEXT_PUBLIC_KAKAO_JS_KEY=발급받은키` 추가 (로컬/EC2 양쪽 모두)

---

## 15. SEO 기본 설정 + 콘텐츠 감수(Audit) 1차 구현

### SEO (요청 4번)
- `app/layout.tsx`: title/description/keywords/OpenGraph/Twitter 메타데이터를
  사주·MBTI·성향테스트 등 실제 검색 의도에 맞춰 채움
- `app/robots.ts`, `app/sitemap.ts`: **개인 데이터가 표시될 수 있는 모든 페이지
  (설문·결과·대시보드·퀘스트·뱃지·성장기록·궁합·친구·공유·로그인)는 기본적으로
  검색 노출을 막고, 홈페이지만 공개**한다. "사용자 동의 시에만 검색 노출"이라는
  요구사항을, 현재는 공개 동의 기능 자체가 없으므로 "기본값 전체 비공개"로
  구현했다 — 추후 "내 결과 공개하기" 동의 토글을 추가하면 그 페이지만
  robots.ts에서 별도로 허용하면 된다
- 홈페이지에 WebApplication 구조화 데이터(JSON-LD) 추가

**"claude-seo skill"이라는 이름의 스킬은 확인 결과 존재하지 않아, 스킬 없이
표준 Next.js 메타데이터 API로 직접 구현했다.**

### 콘텐츠 감수 — Audit AI Agent (요청 3번)
2단계 구조로 구현했다.

1. **1차: 키워드 필터** (`lib/contentModeration.ts`) — 닉네임 제출 시 즉시
   클라이언트에서 확인. 우회가 쉬운 한계가 있어 최종 방어선이 아니라
   즉각적인 사용자 피드백 용도
2. **2차: AI 정밀 검수** (`supabase/functions/moderate-content`) — Supabase
   Edge Function에서 Anthropic API(Claude)를 호출해 종교·성적 비하·인종·장애
   관련 문제 소지를 의미 기반으로 판단. 문제로 판단되면 `moderation_reports`
   테이블에 원문·카테고리와 함께 기록하고 제출을 차단한다. 이 테이블은
   클라이언트에서 조회가 불가능하도록 막아뒀다 (관리자만 Supabase 대시보드에서
   service_role로 조회 — "관리자에게 리포팅" 요구사항 반영)

**배포 방법** (Supabase CLI 설치 필요, `npm install -g supabase` 또는
공식 설치 가이드 참고):
```bash
supabase login
supabase link --project-ref qnyhotenvynbvtpgfcra
supabase functions deploy moderate-content
supabase secrets set ANTHROPIC_API_KEY=sk-ant-실제키
```
그리고 `supabase/migrations/003_moderation_reports.sql`을 SQL Editor에서 실행.

**Anthropic API 키가 아직 없다면**: [console.anthropic.com](https://console.anthropic.com)에서
발급 가능. 이 키가 없으면(또는 배포 전이면) Edge Function이 검수 없이
통과시키도록 만들어놔서, 서비스 흐름 자체는 막히지 않는다 — 1차 키워드
필터만 동작하는 상태로 안전하게 운영된다.

### 남은 것 (요청 1·2번)
- **캐릭터 일러스트(1번)**: 이 환경은 SVG 벡터 일러스트만 가능하고 실사/페인팅풍
  이미지 생성 모델은 없다. 샘플 1~2종 먼저 확인 후 진행 필요
- **디자인/톤 개편(2번)**: `frontend-design` 스킬은 실존해 적용 가능하나,
  "humanizer skill"이라는 이름의 스킬은 존재하지 않아 별도 스킬 없이 직접
  카피·톤을 다듬는 방식으로 진행 필요

---

## 16. 공유 링크로 "결과 보기 허용" 기능

**문제**: 지금까지 `/share/[id]`는 **보내는 사람 기기의 로컬 데이터**로만
렌더링되는 구조였다. 카카오톡 등으로 링크를 보내도, 받는 사람이 열면 자기
기기엔 그 데이터가 없어 카드가 안 보였다(공유 카드 자체는 이미지로 전송돼
보이지만, 링크의 "결과 보기" 버튼은 실제로 작동하지 않았다).

**해결**: 사용자가 명시적으로 동의(옵트인)한 경우에만, 공유 카드 요약
정보를 Supabase(`shared_profiles`)에 저장해 **누구나(로그인·로컬데이터
무관) 조회 가능한 공개 링크**(`/view/[id]`)를 만든다.

- `/share/[id]`에 **"받는 사람도 이 결과를 볼 수 있게 허용"** 체크박스 추가
  (기본 OFF). 체크하면 그 시점에 1회 발행되고, 이후 카카오톡·페이스북·X·문자·
  링크복사 전부 이 공개 링크를 사용한다 (체크 안 하면 기존처럼 로컬 전용
  링크를 그대로 씀 — 동작은 그대로지만 다른 기기에선 안 보임)
- `/view/[id]` — 새 공개 페이지. `shared_profiles`를 조회해 동일한
  `ShareCard`를 렌더링하고, 하단에 "내 유형 알아보기" CTA로 신규 유입 유도
- **개인정보 원칙 유지**: 저장되는 값은 닉네임·유형명·설명·캐릭터
  일러스트 파일명뿐이다. 생년월일·출생시간·성별 원본은 이 테이블에도
  전혀 들어가지 않는다 (일러스트 파일명은 이미 계산된 결과물이지 원본
  성별 값이 아니라는 점에서 기존 `/share` 카드와 동일한 처리)
- `robots.ts`: `/view`는 명시적 동의가 있어야만 데이터가 존재하는 경로라,
  검색 노출도 허용하도록 예외 처리

**검증**: Supabase 미설정 환경에서 발행·조회 함수 모두 안전하게 `null`
처리되는 것을 확인했다. 실제 발행→조회 흐름은 배포 후 실기기에서 확인
필요.

**필요 작업**: `supabase/migrations/004_shared_profiles.sql`을 SQL Editor에서 실행.

---

## 17. npm 취약점 점검

`npm audit` 기준 5개(high) → **2개로 축소**했다.

- **glob**: `package.json`에 `overrides: { "glob": "^11.1.0" }` 추가로 해결.
  `eslint-config-next`가 물고 있던 예전 glob을 안전한 버전으로 강제 고정했다
  (Next.js 버전과 무관하게 독립적으로 고칠 수 있었다)
- **next/postcss**: `npm audit fix --force`가 next 14→16 메이저 업그레이드를
  요구해 지금 당장은 적용하지 않았다. 실제 앱 설정을 CVE 목록과 대조한 결과:
  - `remotePatterns`, `rewrites`, `i18n` 전부 미사용(`next.config.mjs`가 빈 설정)
  - `middleware.ts` 없음, CSP nonce 없음, Pages Router 없음, Server Actions
    (`"use server"`) 없음
  - → 목록의 상당수 CVE(원격 이미지 DoS, 리라이트 SSRF, i18n 미들웨어 우회,
    CSP nonce XSS, WebSocket SSRF, Server Actions 관련 다수)가 실제로는
    해당 사항 없음. 남은 건 주로 App Router 일반 요청 처리 관련 DoS 계열로,
    소규모 서비스 기준 실익-리스크 비율상 지금 강제 업그레이드할 이유는
    낮다고 판단했다

**남은 작업**: Next.js 14 → 15 → 16 단계적 업그레이드를 별도 시간을 잡고
충분히 테스트하며 진행할 것을 권장한다 (한 번에 16으로 뛰지 않기).
