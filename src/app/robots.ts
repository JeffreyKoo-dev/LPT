import type { MetadataRoute } from "next";

/**
 * 검색엔진에 공개할 페이지와 막을 페이지를 구분한다.
 *
 * 원칙: 사용자 개인 데이터나 계산 결과가 표시될 수 있는 모든 페이지는
 * 기본적으로 검색 노출을 막는다. 예외는 /view — 이건 사용자가 "결과 보기
 * 허용"에 명시적으로 동의했을 때만 생성되는 공개 링크라, 검색 노출도
 * 허용한다 (동의하지 않으면 이 경로 자체에 조회 가능한 데이터가 없다).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/view"],
      disallow: [
        "/start",
        "/survey",
        "/result",
        "/dashboard",
        "/quests",
        "/badges",
        "/growth",
        "/compatibility",
        "/friends",
        "/share",
        "/login",
      ],
    },
    sitemap: "https://questofme.com/sitemap.xml",
  };
}
