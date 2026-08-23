# saju-engine (내재화된 ssaju)

이 폴더는 [ssaju](https://github.com/golbin/ssaju) (MIT License, ⓒ 2026 Jin)의
소스 코드를 그대로 가져와 프로젝트 안에 내재화한 것입니다.

## 왜 내재화했는가

- `ssaju`는 npm에 ESM 전용(`.mjs`)으로만 배포되어, 일부 Node.js 버전(20.19/22.12
  미만)의 서버 환경에서 `require()` 로딩이 실패하는 문제가 있었다
  (`next.config.mjs`의 `transpilePackages`로 우회했었음)
- 원광만세력 등 외부 만세력과 세부 계산 방식(서머타임 이력, 지역별 경도 보정 등)을
  직접 맞춰볼 필요가 있어, 외부 패키지가 아니라 프로젝트 코드로 두고 바로 수정할
  수 있어야 했다

## 원본 대비 변경 사항

- `index.ts`의 `export * from "./src/calculate.ts"` → `export * from "./calculate.ts"`
  (원본 저장소는 `src/` 하위 폴더 구조, 이 프로젝트는 평평한 구조로 가져옴)
- 그 외 계산 로직 자체는 원본 그대로이며, 이후 이 프로젝트에서 직접 수정될 수 있음

## 파일 구성

- `calculate.ts` — 메인 진입점 (`calculateSaju`, `lunarToSolar`, `solarToLunar`)
- `manse.ts` — 만세력 핵심 계산 (음력 변환, 절기, 60갑자, 서머타임/표준시 보정)
- `analyze.ts` — 십성/십이운성/신살/대운/세운/월운 등 명리학적 분석
- `constants.ts` — 천간·지지·오행·십성표 등 상수 데이터
- `format.ts` — `toMarkdown()` / `toCompact()` 출력 포맷터 (이 프로젝트에서는 미사용)
- `types.ts` — 타입 정의

## 알려진 정확도 한계 (직접 확인함)

`manse.ts`의 `KOREA_DST_PERIODS`에는 대한민국이 실제로 서머타임을 시행한 기간
중 **1960년, 1987년, 1988년 3개만** 정확한 일자로 포함되어 있다. 실제로는
1948~1951년, 1955~1959년에도 서머타임이 시행됐지만, 해당 연도들의 정확한
시행 시작/종료 일시를 신뢰할 수 있는 자료로 확인하지 못해 추가하지 않았다
(추측으로 채우는 것이 오히려 위험 판단). 이 기간에 태어난 사용자는 시주가
최대 1시간 어긋날 수 있다.

## 라이선스

원본과 동일하게 MIT License를 따릅니다. `LICENSE` 파일 참고.
