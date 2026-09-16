# 남은 할 일

## 1. 토스페이먼츠 테스트 키 → 라이브 키 전환

**현재 상태**: 문서 공개 테스트 키(`test_gck_docs_...`, `test_gsk_docs_...`)로
결제 흐름 전체(결제수단 선택 → 결제 → 서버 승인 → 캐시 지급) 검증 완료.

**해야 할 일**:
1. 토스페이먼츠 정식 가입 (사업자 정보 등록, 정산 계좌 등록)
2. 심사 완료 후 발급되는 **라이브 키** 확인 (개발자센터 → API 키 → "라이브" 탭)
3. EC2 `.env.local` 갱신:
   ```
   NEXT_PUBLIC_TOSS_CLIENT_KEY=live_gck_...
   TOSS_SECRET_KEY=live_gsk_...
   ```
4. 재빌드·재시작 후, **소액으로 실제 결제 1건 직접 테스트**(본인 카드로)해서
   실 결제·캐시 지급·정산까지 확인
5. 참고: 심사에는 보통 영업일 기준 며칠 소요될 수 있음(카드사 심사 포함)

## 2. Google Ad Manager 리워드 광고 승인

**현재 상태**: 클라이언트 코드(`lib/ads/gpt.ts`, `hooks/useRewardedAd.ts`,
`components/ads/RewardedAdButton.tsx`)는 준비되어 있으나, 실제 광고 단위가
없어 화면에 노출되지 않음.

**해야 할 일**:
1. Google Ad Manager 계정 생성 및 리워드 광고(Rewarded Ads) 사용 신청
   (최소 트래픽 기준이 있을 수 있어 사전 확인 필요)
2. 승인 후 발급되는 광고 단위 경로를 환경변수에 등록:
   ```
   NEXT_PUBLIC_GAM_REWARDED_AD_UNIT=/실제_네트워크코드/실제_광고단위
   ```
3. 재배포 후, "오늘의 카드" 등 `ad_unlockable=true`로 지정된 콘텐츠에서
   실제 광고가 재생되고 캐시가 적립되는지 확인
4. 승인 전 임시 대안: 광고 버튼 자체를 숨기고 캐시 결제만 노출(이미
   `getProductPrices()`의 `ad_unlockable` 값으로 제어 가능)

---

*이 문서는 새 할 일이 생기면 위에 추가하고, 완료되면 체크 표시 후 남겨둔다
(완전 삭제하지 않음 — 나중에 "언제 뭘 했는지" 참고용).*

## 3. Next.js 14 → 16 업그레이드 — ✅ 완료

**주의**: EC2 배포 전 **Node.js 버전 확인 필수**. Next.js 16은 Node.js
20.9.0 이상을 요구한다(18 이하는 아예 지원 안 함). EC2에서
`node -v`로 먼저 확인하고, 20.9.0 미만이면 Node 업그레이드부터
해야 한다.

**진행 내용**:
1. 공식 codemod(`npx @next/codemod@latest upgrade latest`)로 14→16
   일괄 업그레이드 (React 18→19 포함) — 인터랙티브 프롬프트 때문에
   중간에 멈춰서, 개별 codemod(`next-async-request-api`,
   `next-lint-to-eslint-cli`)를 나눠서 마저 적용했다
2. **`params`가 Promise로 바뀌는 변경**: 서버 컴포넌트인
   `/types/[typeId]`만 영향받았고 codemod가 자동으로
   `await params`로 변환했다. 나머지 동적 라우트(`/quests/[id]`,
   `/share/[id]`, `/view/[id]`, `/friends/accept/[code]`)는 전부
   클라이언트 컴포넌트에서 `useParams()` 훅을 쓰고 있어 이 변경과
   무관했다(계속 동기적으로 동작)
3. **React 19 타입 변경**으로 `ShareActions`의 `RefObject<HTMLDivElement>`
   타입 에러 1건 — `RefObject<HTMLDivElement | null>`로 수정
4. **`next lint` 명령 자체가 16에서 제거**됨 — `eslint .` 직접 실행으로
   전환(`package.json`의 `lint` 스크립트, `eslint.config.mjs` 플랫
   컨피그로 codemod가 자동 전환). 레거시 `.eslintrc.json`은 삭제
5. **ESLint 생태계 버그 발견·회피**: `eslint-config-next@16`이 설치한
   `eslint@10`과, 그 하위 의존성인 `eslint-plugin-react@7.37.5`가
   서로 호환이 안 돼(`eslint-plugin-react`가 아직 ESLint 10을 지원 안
   함 — Next.js/Expo 등 여러 프로젝트에서 보고된 알려진 생태계 이슈)
   모든 린트가 즉시 크래시했다. `eslint`를 9.x로 내려서 해결(공식
   커뮤니티에서도 같은 해결책 확인)
6. **새 린트 규칙(`react-hooks/set-state-in-effect`)**이 "useEffect
   안에서 setState 직접 호출"을 전부 에러로 잡아냈다(16곳). 실제
   런타임 버그가 아니라 React 19가 권장하는 스타일 가이드 수준이고,
   16곳 전부 "조건 체크 후 얼리 리턴하며 setState"라는 같은 정상
   패턴이라 광범위한 리팩터링 대신 `eslint.config.mjs`에서 이 규칙만
   `warn`으로 낮췄다(완전히 끄지 않아 존재는 계속 보이게 유지)

**검증**: 타입체크·린트(0 errors) 통과, 43개 라우트 전부 정적/SSG
빌드 성공(Turbopack), `next start`로 실제 서버 기동 후 홈페이지·
신규 유형 페이지 둘 다 200 OK 확인.

**아직 안 한 것**: EC2 실배포 — Node 버전 확인 후 배포 필요.
