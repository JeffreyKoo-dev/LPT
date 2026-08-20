import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/common/SiteHeader";
import { SiteFooter } from "@/components/common/SiteFooter";

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
  title: "LPT — Life Pattern Type",
  description:
    "타고난 기질과 지금의 행동 패턴을 함께 읽고, 나에게 맞는 성장 방향을 찾아가는 라이프 전략 RPG.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={sans.variable}>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
