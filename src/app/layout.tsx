import type { Metadata } from "next";
import { Noto_Sans_KR, Song_Myung } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/common/SiteHeader";
import { SiteFooter } from "@/components/common/SiteFooter";
import { AuthSync } from "@/components/common/AuthSync";

/**
 * 본문은 Noto Sans KR, 제목/디스플레이는 Song Myung(전통 인장·목판 인쇄
 * 느낌의 명조 계열)으로 분리한다. 사주라는 소재 자체가 전통 문서·인장의
 * 시각 언어를 갖고 있어, 여기서 타이포그래피의 개성을 가져온다.
 */
const sans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const display = Song_Myung({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

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
    <html lang="ko" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <AuthSync />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
