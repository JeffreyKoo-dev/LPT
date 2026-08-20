# 설치 가이드

## 1. 요구 사항

| 항목 | 버전 |
| --- | --- |
| Node.js | 18.18 이상 (LTS 20.x 권장) |
| npm | 9 이상 (Node.js에 포함) |
| 인터넷 연결 | 최초 빌드/개발 서버 실행 시 필요 (Google Fonts 다운로드) |

버전 확인:
```bash
node -v
npm -v
```

## 2. 압축 해제 및 의존성 설치

```bash
unzip lpt-mvp-final.zip -d lpt
cd lpt
npm install
```

`node_modules`는 zip에 포함되어 있지 않으므로 반드시 `npm install`을 먼저 실행해야 합니다.

## 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 4. 프로덕션 빌드 및 실행

```bash
npm run build
npm run start
```

`npm run start`는 기본적으로 `http://localhost:3000`에서 서비스됩니다. 포트를 바꾸려면:

```bash
npm run start -- -p 4000
```

## 5. 코드 검증 (선택)

```bash
npx tsc --noEmit   # 타입 체크
npx next lint      # ESLint 검사
```

## 6. 폰트 관련 주의사항

이 프로젝트는 `next/font/google`로 Noto Sans KR / Black Han Sans / Cinzel 폰트를
불러옵니다. **최초 `npm run dev` 또는 `npm run build` 실행 시 인터넷 연결이 반드시
필요**합니다 (`fonts.googleapis.com` 접근). 사내망·방화벽 환경에서 해당 도메인이
차단되어 있다면 빌드가 실패할 수 있습니다.

해결 방법:
- 방화벽/프록시에서 `fonts.googleapis.com`, `fonts.gstatic.com` 허용, 또는
- `src/app/layout.tsx`의 `next/font/google` import를 제거하고 시스템 폰트로 대체
  (아래 "문제 해결" 참고)

## 7. 문제 해결

### Q. `Cannot find module 'autoprefixer'` 에러가 발생해요
Tailwind CSS의 PostCSS 파이프라인이 `autoprefixer`를 필요로 하는데 설치되어 있지
않은 경우입니다. 아래 명령으로 설치 후 다시 실행하세요.

```bash
npm install -D autoprefixer
npm run dev
```

### Q. 빌드 시 `Failed to fetch font ...` 에러가 발생해요
Google Fonts 도메인에 접근할 수 없는 네트워크 환경입니다. `src/app/layout.tsx`를
임시로 아래처럼 수정해 시스템 폰트로 빌드할 수 있습니다.

```tsx
// src/app/layout.tsx (임시 대체 예시)
import "./globals.css";
import { SiteHeader } from "@/components/common/SiteHeader";
import { SiteFooter } from "@/components/common/SiteFooter";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col font-body antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
```

인터넷 연결이 정상인 환경에서는 원래 파일 그대로 사용하면 됩니다.

### Q. `npm install` 중 `high severity vulnerabilities` 경고가 떠요
`npm audit` 관련 경고로, 개발/빌드 자체를 막지 않습니다. 필요 시 `npm audit fix`로
검토 후 적용하세요 (일부는 breaking change를 포함할 수 있어 `--force` 사용 전
변경 사항을 확인하는 것을 권장합니다).

### Q. 데이터가 저장되지 않거나 초기화돼요
이 MVP는 LocalStorage 기반이므로:
- 시크릿/프라이빗 브라우징 모드에서는 세션 종료 시 데이터가 사라질 수 있습니다.
- 브라우저 저장 공간을 수동으로 지우면 진행 데이터가 초기화됩니다.
- 다른 브라우저·기기에서는 이전 데이터가 보이지 않습니다 (기기별 저장).

### Q. 포트 3000이 이미 사용 중이에요
```bash
npm run dev -- -p 3001
```

## 8. 배포 시 참고

- 정적 페이지(홈, `/start`, `/survey`, `/dashboard` 등)와 동적 라우트(`/quests/[id]`,
  `/share/[id]`)가 혼재되어 있으므로, Vercel 등 Next.js를 네이티브로 지원하는
  플랫폼에 배포하는 것을 권장합니다.
- 이 서비스는 클라이언트(브라우저) LocalStorage에만 데이터를 저장하므로 별도의
  데이터베이스 설정 없이 정적/서버리스 배포가 가능합니다.
