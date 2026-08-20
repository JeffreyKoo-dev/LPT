# LPT — Life Pattern Type 개발 명세서

버전: MVP 1.0 (Sprint 1~5 완료)
최종 업데이트: 2026-08-19

---

## 1. 서비스 개요

**LPT(Life Pattern Type)**는 사용자의 생년월일시 기반 사주팔자와 성향 설문 기반
행동 패턴을 결합하여, 개인의 타고난 기질·현재 행동 성향·관계 방식·일하는 방식·
성장 방향을 분석하는 **자기이해·라이프 전략 RPG** 서비스다. 단순 운세 앱이나
MBTI 테스트가 아니다.

### 핵심 컨셉 매핑

| 세계관 요소 | 실제 의미 |
| --- | --- |
| 사주 | 타고난 기질 구조 |
| 성향 설문 | 현재 드러나는 행동 성향 |
| 대운·세운 | 시기별 변화 흐름 (추후 확장 예정) |
| 라이프스타일 인디케이터 | 사용자의 생활·일·관계·성장 방식 시각화 |
| 성장 퀘스트 | 부족한 부분을 개선하고 강점을 강화하는 행동 미션 |
| 레벨업/뱃지 | 성장 기록과 공유 요소 |

### 표현 원칙 (전 화면 공통 적용)

- 운명 결정론적 문구 금지: "반드시 성공/실패", "무조건", "운명이 정해져 있다" 등 사용 안 함
- 결과는 항상 "경향 / 가능성 / 도움이 될 수 있음" 톤으로 표현
- 공식 MBTI 문항을 그대로 사용하지 않으며, "MBTI 검사" 대신 **"16유형 성향 설문 (Life
  Pattern Profiler)"** 표현 사용
- "궁합" 대신 **"관계 적합도 / 협업 적합도 / 파트너십 적합도"** 표현 사용
- 공유 카드에는 생년월일 · 출생시간 · 성별 · 설문 상세 응답을 절대 노출하지 않음

---

## 2. 기술 스택

| 영역 | 선택 기술 | 비고 |
| --- | --- | --- |
| 프레임워크 | Next.js 14 (App Router) | `src/` 디렉터리 구조 사용 |
| 언어 | TypeScript | strict 모드 |
| 스타일 | Tailwind CSS | CSS 변수 기반 다크 판타지 테마 토큰 |
| UI 컴포넌트 | 자체 shadcn 스타일 프리미티브 | Button/Card/ProgressBar 등 |
| 차트 | Recharts | 오행 레이더 차트 |
| 이미지 캡처 | html-to-image | 공유 카드 PNG 저장 |
| 상태 저장 | LocalStorage (`lib/storage.ts` 추상화) | 추후 Supabase/Prisma로 교체 가능한 구조 |
| 폰트 | next/font/google (Noto Sans KR, Black Han Sans, Cinzel) | 빌드 시 인터넷 연결 필요 |

---

## 3. 정보 구조 (IA) / 라우팅

```
/                  홈
/start             기본 정보 입력
/survey            36문항 설문
/result            결과 리포트
/dashboard         성장 대시보드
/quests            퀘스트 목록
/quests/[id]       퀘스트 상세
/growth            성장 히스토리
/badges            뱃지
/share/[id]        공유 카드 (character | level-{n} | badge-{id})
```

### 사용자 플로우

```
/  → /start(기본정보) → /survey(36문항) → 자동 분석 실행
                                              ↓
                                          /result(리포트)
                                              ↓
                        /dashboard ⇄ /quests ⇄ /quests/[id](완료 시 XP/레벨업/뱃지)
                                              ↓
                                      /growth(히스토리) / /badges(컬렉션)
                                              ↓
                                      /share/[id](PNG 저장·링크 복사)
```

---

## 4. 폴더 구조

```
src/
  app/                라우트별 페이지 (App Router)
  components/
    common/           Button, Card, ProgressBar, StarField, GuardScreen, SiteHeader/Footer
    form/             TextField, SegmentedControl, Checkbox, LikertScale
    result/           CharacterCard, ElementRadar, AxisScoreBars, TenGodsPanel,
                       LifestyleIndicatorPanel, SynergyPanel, DailyCardWidget
    growth/           StatGrid, LevelPanel, GrowthTimeline
    quest/            QuestCard
    badge/            BadgeCard
    share/            ShareCard(PNG 캡처 대상 DOM), ShareActions(저장/복사 버튼)
  data/
    questions.ts       36문항 설문 데이터
    solarTerms.ts       24절기 근사 날짜
    lptTypes.ts         LPT 12유형 메타데이터
    fantasyClasses.ts   유형 → 판타지 클래스 매핑
    levels.ts           레벨별 누적 필요 XP
    quests.ts           성장 퀘스트 13종
    badges.ts           뱃지 8종 (조건 함수 포함)
    dailyTips.ts        "오늘의 LPT 카드" 문구 풀
  lib/
    storage.ts          LocalStorage 추상화 레이어
    survey.ts            설문 저장/진행률 + 축점수 계산
    saju.ts               사주팔자 계산
    lpt.ts                 LPT 12유형 산출
    report.ts              사주+설문+유형 결합 → 분석 리포트 저장
    indicator.ts            라이프스타일 인디케이터 계산
    dailyCard.ts             오늘의 LPT 카드 (날짜 시드)
    growth.ts                 XP/레벨/스탯 로직
    growthHistory.ts           성장 히스토리 타임라인 재구성
    quest.ts                    퀘스트 추천/완료 처리
    badge.ts                     뱃지 자동 지급
    share.ts                      공유 카드 데이터 빌더 + 라우트 파라미터 파싱
    useGrowthSession.ts            대시보드/퀘스트/뱃지 공통 세션 훅
    utils.ts                        cn() 클래스 병합 헬퍼
  types/                각 도메인 타입 정의
```

---

## 5. 핵심 데이터 모델

### BasicInfo (`types/user.ts`)
```ts
interface BasicInfo {
  nickname: string;
  birthDate: string;        // "YYYY-MM-DD"
  birthTime: string | null; // "HH:mm"
  birthTimeUnknown: boolean;
  calendarType: "solar" | "lunar";
  gender: "male" | "female";
  createdAt: string;
}
```

### SajuChart (`types/saju.ts`)
연/월/일/시주(Pillar: 천간+지지), 일간(dayMaster), 오행 분포(elementCounts),
최다 오행(dominantElement), 십성(년/월/시 천간 기준)을 담는다.

### AxisScores (`types/survey.ts`)
EI/SN/TF/JP 4개 축을 각각 0~100 점수로 표현 (높을수록 축의 첫 글자 방향).

### LptTypeResult / LptTypeMeta (`types/lpt.ts`)
12유형 식별자(`LptTypeId`)와 메타데이터(이름/태그라인/설명/강점/성장포인트).

### AnalysisReport (`types/report.ts`)
`SajuChart + AxisScores + LptTypeResult`를 하나로 묶은 최종 분석 결과.
`STORAGE_KEYS.analysis`에 저장.

### GrowthProfile (`types/growth.ts`)
```ts
interface GrowthProfile {
  typeId: LptTypeId;
  xp: number;
  stats: { 활력: number; 통찰: number; 조율: number; 지구력: number };
  questLog: { questId: string; completedAt: string }[];
  badges: string[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. 핵심 계산 파이프라인

```
BasicInfo ─┬─> calculateSaju()       ─┐
           │                          ├─> deriveLptType() ─> AnalysisReport (저장)
SurveyAnswer[] ─> computeAxisScores() ┘         │
                                                  ├─> computeLifestyleIndicator()
                                                  └─> getDailyCard(quadrant)

AnalysisReport.typeId ─> createInitialGrowthProfile() ─> GrowthProfile (저장)
GrowthProfile + Quest 완료 ─> applyReward() ─> checkAndAwardBadges() ─> GrowthProfile (갱신)
GrowthProfile.questLog + badges ─> buildGrowthHistory() ─> 타임라인
GrowthProfile/AnalysisReport ─> buildXShareData() ─> ShareCard(PNG) / 링크 복사
```

### 6.1 사주 계산 (`lib/saju.ts`)

> **MVP NOTICE**: This saju calculation is a simplified implementation. Solar term
> timestamps and day-pillar offset must be validated against an authoritative Korean
> manse calendar before production use.

- **연주**: `data/solarTerms.ts`의 입춘 근사 날짜(2/4)를 연 경계로 사용, `(연도-4) % 10 / 12`
  근사식으로 천간·지지 산출
- **월주**: 오호둔법(五虎遁) — 연간에 따라 인월(寅月) 월간이 결정되고, 이후 달력 월을
  그대로 인월부터 순환 배정 (절기 미반영 근사)
- **일주**: 그레고리력 → 율리우스일(JDN) 변환 후 60갑자 순환식 적용
- **시주**: 오자둔법(五子遁) — 일간에 따라 자시(子時) 시간이 결정, 2시간 단위 지지 배정.
  출생시간 미입력 시 `null`
- **오행 분포**: 8글자(시주 모를 경우 6글자)의 천간·지지 오행을 집계, 최다 오행을
  `dominantElement`로 지정
- **십성**: 일간을 기준으로 년/월/시 천간과의 생극 관계를 계산 (지지·지장간은 MVP 범위 밖)

### 6.2 설문 축점수 (`lib/survey.ts`)

- 36문항(EI/SN/TF/JP 각 9문항)의 응답(1~5)을 문항의 `direction`으로 정규화
- 축당 원점수 9~45를 0~100으로 스케일링, 50 이상이면 축의 첫 글자(E/S/T/J) 우세

### 6.3 LPT 12유형 산출 (`lib/lpt.ts`)

- **사주 에너지 그룹**(3): 목/화 → 성장기, 토 → 균형기, 금/수 → 수렴기
- **설문 행동 스타일**(4): EI×JP 조합 → 추진형/확장형/설계형/탐색형
- 3 × 4 = **12유형** 매트릭스로 최종 유형 결정 (`data/lptTypes.ts`)

### 6.4 라이프스타일 인디케이터 (`lib/indicator.ts`)

사주 에너지 그룹 보정치 + 설문 축점수를 가중합해 4축(일하는 방식/관계 방식/생활
리듬/성장 방향)을 0~100으로 산출.

### 6.5 성장 시스템 (`lib/growth.ts`, `lib/quest.ts`, `lib/badge.ts`)

- **레벨**: 누적 XP 임계값 배열(`data/levels.ts`, 최대 Lv.10) 기준으로 계산
- **퀘스트**: 13종(4개 스탯 × 3 + 온보딩 1), 캐릭터의 대표 스탯과 `focusStat`이 일치하는
  퀘스트를 우선 추천. 완료 시 XP·스탯 반영 → 퀘스트 로그 기록 → 뱃지 조건 검사를 한 번에 처리
- **뱃지**: 8종, 조건 함수(퀘스트 수/레벨/스탯 균형·특화)를 매 퀘스트 완료 시 전수 검사해
  미획득 항목 중 조건 충족 시 자동 지급, 획득 시각은 별도 LocalStorage 맵에 기록

### 6.6 성장 히스토리 (`lib/growthHistory.ts`)

별도의 이력 저장소 없이, 이미 저장된 `questLog`(시각 포함)와 뱃지 획득 시각 맵을
재조합해 타임라인을 만든다. 퀘스트를 시간순으로 재생하며 누적 XP가 레벨 경계를
넘는 시점에 레벨업 이벤트를 자동 삽입한다.

### 6.7 공유 카드 (`lib/share.ts`, `components/share/`)

- 3종 카드: `character`(캐릭터) / `level-{n}`(레벨업) / `badge-{id}`(뱃지)
- `ShareCard`는 인라인 스타일 기반 DOM으로, `html-to-image`가 그대로 캡처해 PNG로 저장
- `navigator.clipboard.writeText()`로 현재 URL 복사
- 카드에는 닉네임·유형명·클래스명·레벨·뱃지명만 노출되며, 생년월일·출생시간·성별·
  설문 상세 응답은 **코드 레벨에서 포함되지 않음**을 보장 (`lib/share.ts`의
  `ShareCardData` 타입에 해당 필드 자체가 존재하지 않음)

---

## 7. 저장소 구조 (LocalStorage)

`lib/storage.ts`의 `STORAGE_KEYS`:

| 키 | 내용 |
| --- | --- |
| `lpt:basicInfo` | `BasicInfo` |
| `lpt:survey` | `SurveyState` (응답 목록, 진행 상태) |
| `lpt:analysis` | `AnalysisReport` (사주+설문+유형) |
| `lpt:growthProfile` | `GrowthProfile` (XP/스탯/퀘스트로그/뱃지) |
| `lpt:badges` | 뱃지별 획득 시각 맵 (`Record<badgeId, ISO timestamp>`) |
| `lpt:quests` | 예약 키 (현재 미사용, 향후 사용자 정의 퀘스트 등 확장용) |

### Supabase/Prisma 전환 가이드

`LptStorage` 인터페이스(`get/set/remove/clearAll`)를 그대로 구현하는
`SupabaseStorage` 클래스를 추가하고, `getStorage()`가 반환하는 인스턴스만
교체하면 나머지 모든 모듈은 수정 없이 동작한다.

```ts
export interface LptStorage {
  get<T>(key: StorageKey): T | null;
  set<T>(key: StorageKey, value: T): void;
  remove(key: StorageKey): void;
  clearAll(): void;
}
```

---

## 8. 알려진 제한 사항 (배포 전 검토 필요)

1. 사주 계산이 절기 근사치를 사용하는 간략 구현 (`lib/saju.ts` MVP NOTICE 참고)
2. 음력 생년월일 입력을 별도 변환 없이 양력으로 간주해 계산
3. 십성 계산이 년/월/시 천간까지만 반영, 지지·지장간 생략
4. 공유 링크(`/share/[id]`)가 서버 저장 없이 현재 기기의 LocalStorage 데이터로만
   카드를 그리므로, 다른 기기·브라우저에서 열면 안내 화면이 표시됨

## 9. 향후 로드맵 (MVP 이후)

- LocalStorage → Supabase/Prisma 전환 (로그인 · 멀티 디바이스 지원)
- 정밀 만세력 · 절기 시각 DB 연동, 음력 변환 지원
- 대운·세운(시기별 변화 흐름) 반영
- 결제/구독, 공유 카드 서버 저장(타 기기에서도 열람 가능)
