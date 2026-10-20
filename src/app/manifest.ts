import type { MetadataRoute } from "next";

/**
 * PWA 매니페스트. 아이폰(iOS)의 웹 푸시는 "홈 화면에 추가"로 설치된 웹앱에서만
 * 동작하므로, 설치 가능한 앱으로 인식되게 해서 푸시 도달률을 높인다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "사주 기반 성향 테스트 LPT",
    short_name: "QuestofMe",
    description: "사주팔자와 성향 설문으로 찾는 나만의 라이프 패턴 유형",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fff6ec",
    theme_color: "#8a5fae",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
