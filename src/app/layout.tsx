import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/common/SiteHeader";
import { SiteFooter } from "@/components/common/SiteFooter";
import { AuthSync } from "@/components/common/AuthSync";

/**
 * 타이포그래피는 단일 서체(Noto Sans KR) + 굵기 스케일로만 위계를 만든다.
 * 장식용 디스플레이 서체를 섞지 않는 것이 절제된 UI의 기본 원칙이다.
 */
const sans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://questofme.com"),
  title: {
    default: "LPT — 사주 기반 성향 테스트 | Life Pattern Type",
    template: "%s | LPT",
  },
  description:
    "사주팔자와 성향 설문(MBTI식 행동 유형 검사)을 함께 분석해 나만의 라이프 패턴 유형(LPT)을 찾는 자기이해 서비스. 타고난 기질과 지금의 행동 패턴을 함께 읽고, 성장 퀘스트로 라이프 전략을 세워보세요.",
  keywords: ["사주", "MBTI", "성향테스트", "성격유형검사", "자기이해", "사주팔자", "라이프패턴", "LPT"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://questofme.com",
    siteName: "LPT — Life Pattern Type",
    title: "LPT — 사주 기반 성향 테스트",
    description: "사주팔자 + 성향 설문으로 찾는 나만의 라이프 패턴 유형. 타고난 기질과 지금의 나를 함께 읽어보세요.",
  },
  twitter: {
    card: "summary",
    title: "LPT — 사주 기반 성향 테스트",
    description: "사주팔자 + 성향 설문으로 찾는 나만의 라이프 패턴 유형",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={sans.variable}>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <AuthSync />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
