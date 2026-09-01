import type { Metadata } from "next";
import "@fontsource/noto-sans-kr/korean-400.css";
import "@fontsource/noto-sans-kr/korean-500.css";
import "@fontsource/noto-sans-kr/korean-600.css";
import "@fontsource/noto-sans-kr/korean-700.css";
import "@fontsource/song-myung/korean-400.css";
import "./globals.css";
import { SiteHeader } from "@/components/common/SiteHeader";
import { SiteFooter } from "@/components/common/SiteFooter";
import { AuthSync } from "@/components/common/AuthSync";

/**
 * 본문은 Noto Sans KR, 제목/디스플레이는 Song Myung(전통 인장·목판 인쇄
 * 느낌의 명조 계열)으로 분리한다. 사주라는 소재 자체가 전통 문서·인장의
 * 시각 언어를 갖고 있어, 여기서 타이포그래피의 개성을 가져온다.
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
  },
  twitter: {
    card: "summary",
    title: "사주 기반 성향 테스트 LPT",
    description: "사주팔자와 성향 설문으로 찾는 나만의 라이프 패턴 유형",
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
