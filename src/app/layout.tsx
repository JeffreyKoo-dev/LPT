import type { Metadata } from "next";
import "@fontsource/noto-sans-kr/korean-400.css";
import "@fontsource/noto-sans-kr/korean-500.css";
import "@fontsource/noto-sans-kr/korean-600.css";
import "@fontsource/noto-sans-kr/korean-700.css";
import "@fontsource/jua/korean-400.css";
import "./globals.css";
import { SiteHeader } from "@/components/common/SiteHeader";
import { SiteFooter } from "@/components/common/SiteFooter";
import { AuthSync } from "@/components/common/AuthSync";

/**
 * 본문은 Noto Sans KR, 제목/디스플레이는 Jua(동글동글하고 부드러운 인상의
 * 라운드 서체)로 분리한다. 밝고 귀여운 캐릭터 일러스트 톤에 맞춰, 무거운
 * 명조 대신 친근한 라운드 서체를 골랐다.
 *
 * next/font/google 대신 @fontsource 패키지로 폰트 파일 자체를 프로젝트에
 * 내장한다. next/font/google은 next build 실행 시점마다 fonts.gstatic.com에
 * 직접 접속해 폰트를 내려받는데, 서버(EC2)의 네트워크 상태에 따라 이 요청이
 * 실패·재시도를 반복할 수 있다 (실제로 배포 중 이 문제가 발생했었다).
 * @fontsource는 npm install 시점에 폰트 파일을 node_modules에 통째로
 * 내려받아두므로, 빌드 때는 로컬 파일만 사용해 이 문제가 원천적으로
 * 발생하지 않는다.
 */

export const metadata: Metadata = {
  metadataBase: new URL("https://questofme.com"),
  title: {
    default: "사주 기반 성향 테스트 LPT",
    template: "%s | LPT",
  },
  description:
    "사주팔자와 성향 설문(MBTI식 행동 유형 검사)을 함께 분석해 나만의 라이프 패턴 유형(LPT)을 찾는 자기이해 서비스. 타고난 기질과 지금의 행동 패턴을 함께 읽고, 성장 퀘스트로 라이프 전략을 세워보세요.",
  keywords: ["사주", "MBTI", "성향테스트", "성격유형검사", "자기이해", "사주팔자", "라이프패턴", "LPT"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://questofme.com",
    siteName: "사주 기반 성향 테스트 LPT",
    title: "사주 기반 성향 테스트 LPT",
    description: "사주팔자와 성향 설문으로 찾는 나만의 라이프 패턴 유형. 타고난 기질과 지금의 나를 함께 읽어보세요.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "LPT — 사주로 찾는 나의 라이프 패턴" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "사주 기반 성향 테스트 LPT",
    description: "사주팔자와 성향 설문으로 찾는 나만의 라이프 패턴 유형",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <AuthSync />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
