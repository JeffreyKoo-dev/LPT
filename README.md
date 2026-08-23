# LPT — Life Pattern Type (MVP)

생년월일시 기반 사주팔자와 성향 설문을 결합해, 타고난 기질·현재 행동 패턴·성장 방향을
캐릭터 카드와 성장 퀘스트로 보여주는 자기이해·라이프 전략 RPG 서비스입니다.
단순 운세 앱이나 MBTI 테스트가 아닙니다.

## 디자인 시스템

과도하게 화려한 "AI 생성 느낌"을 걷어내고, 절제된 제품 UI 기준으로 다시 잡았다.

- **타이포그래피**: Noto Sans KR 단일 서체. 장식용 디스플레이 서체 없이 굵기(400~800)와
  자간(`tracking-tight`)만으로 위계를 표현
- **색상**: 거의 무채색에 가까운 다크 배경(`#0a0a0c`) + 강조색 2개만 사용
  (`fate` = 인터랙션용 보라, `growth` = 보상/성취 전용 브론즈). 3번째 색(teal) 제거
- **그림자/장식**: 컬러 글로우, 블러 블롭, 반짝이는 배경 애니메이션 전부 제거.
  절제된 흑색 elevation 그림자(`shadow-card`)만 사용
- **아이콘**: 유니코드 기호(★ ◆ ？) 대신 `lucide-react` 아이콘 시스템으로 통일
- **형태**: 버튼은 pill 대신 `rounded-lg`, 카드는 `rounded-xl`로 계층을 구분

## 문서

- [개발 명세서](docs/DEVELOPMENT_SPEC.md) — 아키텍처, 데이터 모델, 계산 파이프라인, 저장소 구조
- [설치 가이드](docs/INSTALL_GUIDE.md) — 요구 사항, 설치/실행 방법, 문제 해결
- [사용법 가이드](docs/USAGE_GUIDE.md) — 화면별 사용 방법 (홈 → 설문 → 결과 → 성장 → 공유)

## 표현 원칙 (전체 화면 공통 적용)

- 운명 결정론적 문구 금지 ("반드시", "무조건", "운명이 정해져 있다" 등)
- 결과는 항상 "경향 / 가능성 / 도움이 될 수 있음" 톤으로 표현
- 공식 MBTI 문항 대신 자체 "16유형 성향 설문 (Life Pattern Profiler)" 문항 사용
- "궁합" 대신 "관계 적합도 / 협업 적합도 / 파트너십 적합도" 표현 사용
- 공유 카드에는 생년월일 · 출생시간 · 성별 · 설문 상세 응답 노출 금지

## 개발 현황 — MVP 5개 스프린트 모두 완료

- [x] **Sprint 1** — 프로젝트 구조 · 공통 레이아웃 · 홈 · 기본 정보 입력(`/start`) · 36문항 설문(`/survey`) · LocalStorage 저장
- [x] **Sprint 2** — 사주 계산 · 설문 축점수 계산 · LPT 12유형 산출 · 판타지 클래스 매핑 · 분석 결과 저장
- [x] **Sprint 3** — 결과 화면(`/result`) · 캐릭터 카드 · 오행/성향/십성 시각화 · 라이프스타일 인디케이터 · 성장 시너지/포인트 · 오늘의 LPT 카드
- [x] **Sprint 4** — 성장 프로필(`/dashboard`) · 퀘스트(`/quests`, `/quests/[id]`) · XP/스탯/레벨업 · 뱃지 지급(`/badges`)
- [x] **Sprint 5** — 성장 히스토리(`/growth`) · 공유 카드(`/share/[id]`) PNG 저장·링크 복사 · QA · 배포 준비

## 시작하기

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

> 폰트는 `next/font/google` (Noto Sans KR / Black Han Sans / Cinzel)을 사용하므로
> 최초 빌드·개발 서버 실행 시 인터넷 연결이 필요합니다. (본 리포지토리는 개발 샌드박스의
> 제한된 네트워크 환경 특성상, 폰트를 시스템 폰트로 임시 교체한 상태로 `next build` 전체
> 라우트(11개) 컴파일 성공을 확인했습니다 — 아래 QA 참고)

## 전체 페이지

| 경로 | 설명 |
| --- | --- |
| `/` | 홈 — 서비스 소개 |
| `/start` | 기본 정보 입력 (닉네임 · 생년월일시 · 양력/음력 · 성별) |
| `/survey` | 36문항 성향 설문 |
| `/result` | 분석 결과 리포트 (캐릭터 카드, 오행/성향/십성, 인디케이터) |
| `/dashboard` | 성장 대시보드 (레벨, 스탯, 뱃지 요약) |
| `/quests` | 추천 성장 퀘스트 목록 |
| `/quests/[id]` | 퀘스트 상세 및 완료 처리 |
| `/growth` | 성장 히스토리 타임라인 |
| `/badges` | 뱃지 컬렉션 |
| `/share/[id]` | 공유 카드 (character / level-N / badge-ID) |

## 폴더 구조

```
src/
  app/                라우트별 페이지 (App Router, 위 표와 1:1 대응)
  components/
    common/           Button, Card, ProgressBar, StarField, GuardScreen, Header/Footer
    form/             TextField, SegmentedControl, Checkbox, LikertScale
    result/           CharacterCard, ElementRadar, AxisScoreBars, TenGodsPanel,
                       LifestyleIndicatorPanel, SynergyPanel, DailyCardWidget
    growth/           StatGrid, LevelPanel, GrowthTimeline
    quest/            QuestCard
    badge/             BadgeCard
    share/            ShareCard(PNG 캡처 대상), ShareActions(저장/복사)
  data/
    questions.ts      36문항 설문 데이터 (EI/SN/TF/JP 각 9문항, 자체 제작)
    solarTerms.ts      24절기 근사 날짜 (연주 경계 판정용)
    lptTypes.ts        LPT 12유형 메타(이름/태그라인/강점/성장포인트)
    fantasyClasses.ts  유형 → 판타지 클래스 매핑
    levels.ts          레벨별 누적 필요 XP
    quests.ts          성장 퀘스트 13종
    badges.ts          뱃지 8종 (조건 함수 포함)
    dailyTips.ts        "오늘의 LPT 카드" 문구 풀
  lib/
    storage.ts         LocalStorage 추상화 (Supabase/Prisma 전환 지점)
    survey.ts           설문 저장/진행률 + 축점수 계산
    saju.ts             사주팔자 계산 (MVP NOTICE 포함)
    lpt.ts               LPT 12유형 산출
    report.ts           사주+설문+유형 결합 → 분석 리포트 저장
    indicator.ts         라이프스타일 인디케이터 계산
    dailyCard.ts          오늘의 LPT 카드 (날짜 시드)
    growth.ts             XP/레벨/스탯 로직
    growthHistory.ts      성장 히스토리 타임라인 재구성
    quest.ts               퀘스트 추천/완료 처리
    badge.ts                뱃지 자동 지급
    share.ts                 공유 카드 데이터 빌더 + 라우트 파라미터 파싱
    useGrowthSession.ts       대시보드/퀘스트/뱃지 공통 세션 훅
    utils.ts                   cn() 클래스 병합 헬퍼
  types/                각 도메인 타입 정의 (user/survey/saju/lpt/indicator/report/growth/quest/badge)
```

## 저장소 전환 가이드 (LocalStorage → Supabase/Prisma)

`src/lib/storage.ts`의 `LptStorage` 인터페이스를 그대로 구현하는 `SupabaseStorage`
클래스를 추가하고, `getStorage()`가 반환하는 인스턴스만 교체하면 나머지 모든 모듈은
수정 없이 그대로 동작합니다.

## 핵심 계산 파이프라인

```
BasicInfo ─┬─> calculateSaju()      ─┐
           │                         ├─> deriveLptType() ─> AnalysisReport (저장)
SurveyAnswer[] ─> computeAxisScores() ┘         │
                                                  ├─> computeLifestyleIndicator()
                                                  └─> getDailyCard(quadrant)

AnalysisReport.typeId ─> createInitialGrowthProfile() ─> GrowthProfile (저장)
GrowthProfile + Quest 완료 ─> applyReward() ─> checkAndAwardBadges() ─> GrowthProfile (갱신)
GrowthProfile.questLog + badges ─> buildGrowthHistory() ─> 타임라인
GrowthProfile/AnalysisReport ─> buildXShareData() ─> ShareCard(PNG) / 링크 복사
```

## Sprint 2 — 사주/유형 산출

- `lib/saju.ts`: 연/월/일/시주 계산(연주 근사식·오호둔·JDN 60갑자·오자둔), 오행 분포, 십성(년/월/시 천간). **MVP NOTICE**: 절기·만세력 근사치 사용, 정식 서비스 전환 전 검증된 만세력 데이터로 교체 필요
- `lib/lpt.ts`: 사주 오행(목화=성장기/토=균형기/금수=수렴기) × 설문 행동스타일(EI×JP 4그룹) = LPT 12유형 매트릭스
- `data/lptTypes.ts` / `data/fantasyClasses.ts`: 유형별 이름·태그라인·강점·성장포인트·판타지 클래스 (전부 "경향/가능성" 톤)

## Sprint 3 — 결과 리포트

- `lib/indicator.ts`: 사주 에너지 그룹 + 설문 축점수 → 일/관계/생활리듬/성장방향 4축 인디케이터(0~100)
- `lib/dailyCard.ts`: 행동 스타일별 팁 문구를 날짜 시드로 결정론적 순환 노출
- `components/result/`: 캐릭터 카드, Recharts 오행 레이더, 성향 점수 바, 십성 패널 등

## Sprint 4 — 성장 시스템

- `lib/growth.ts`: 4스탯(활력/통찰/조율/지구력) + 누적 XP → 레벨(최대 10)
- `data/quests.ts`(13종) + `lib/quest.ts`: 캐릭터 대표 스탯과 맞는 퀘스트 우선 추천, 완료 시 보상·로그·뱃지 체크를 한 번에 처리
- `data/badges.ts`(8종) + `lib/badge.ts`: 조건(퀘스트 수/레벨/스탯 균형·특화) 충족 시 자동 지급

## Sprint 5 — 히스토리 · 공유 · QA

- `lib/growthHistory.ts`: 별도 이력 저장소 없이 questLog + 뱃지 획득 시각을 재조합해 타임라인 생성 (퀘스트 완료 → 레벨업 → 뱃지 획득이 시간순으로 정렬)
- `lib/share.ts` + `components/share/`: `/share/character`, `/share/level-{n}`, `/share/badge-{id}` 세 종류의 공유 카드를 `html-to-image`로 PNG 저장, `navigator.clipboard`로 링크 복사. 카드에는 닉네임·유형명·레벨·뱃지명만 노출되며 생년월일·출생시간·성별·설문 응답은 포함하지 않음
- 대시보드/뱃지 목록/퀘스트 완료 화면에서 관련 공유 카드로 바로 연결

### QA 체크 결과

- `npx tsc --noEmit` — 통과 (에러 0)
- `npx next lint` — 통과 (경고/에러 0)
- `npx next build` — 시스템 폰트로 임시 교체 후 11개 라우트(정적 9개 + 동적 2개) 전체 컴파일 성공 확인 (샌드박스 네트워크가 Google Fonts 도메인을 차단하는 환경적 제약으로, 실제 배포/로컬 실행 시에는 원래 폰트 설정 그대로 정상 빌드됩니다)
- 스크립트로 전체 파이프라인 직접 실행 검증: 사주 계산 → 설문 점수 → 유형 산출 → 인디케이터 → 오늘의 카드 → 퀘스트 13종 완료 시뮬레이션(레벨 1→4, 뱃지 5종 정상 트리거) → 히스토리 타임라인 재구성 → 공유 카드 데이터/라우트 파싱까지 값 확인 완료

### 알려진 제한 사항 (배포 전 검토 필요)

- 사주 계산은 `ssaju` 라이브러리(KASI 음력 데이터 + 절입시각 기반)로 정밀 계산합니다. 대한민국 표준시 변경 이력(1908~1911, 1954~1961년 UTC+8:30 기간)과 진태양시(선택 옵션) 보정도 반영합니다 (`lib/saju.ts` 상단 주석 참고)
- 1948~1988년 사이 간헐적으로 시행된 서머타임(일광절약시간)은 반영하지 않습니다 — 해당 기간 출생자는 시주가 최대 1시간 어긋날 수 있습니다
- 진태양시 보정은 서울 경도(126.9784) 기준 근사치이며, 출생지별 정확한 경도는 반영하지 않습니다
- 음력 입력 시 윤달 여부는 항상 평달로 간주합니다 (윤달 선택 UI 미제공)
- 공유 링크(`/share/[id]`)는 별도 백엔드 없이 현재 기기의 LocalStorage 데이터로만 카드를 그리므로, 다른 기기·브라우저에서 열면 안내 화면이 표시됩니다 — 실제 공유 기능 완성을 위해서는 서버 저장이 필요합니다
- 십성 계산은 천간·지지를 모두 반영합니다 (지지는 지장간 정기 기준). 다만 지장간 여기·중기까지 상세히 펼쳐 보여주지는 않습니다 (`ssaju`가 데이터는 제공하므로 필요 시 확장 가능)

## 다음 단계 (MVP 이후)

- LocalStorage → Supabase/Prisma 전환 (로그인/멀티 디바이스 지원)
- 서머타임 이력 반영, 출생지 경도 직접 입력(진태양시 정밀 보정), 음력 윤달 입력 지원
- 결제/구독, 공유 카드 서버 저장(다른 기기에서도 열람 가능하도록)
