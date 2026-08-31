import type { MetadataRoute } from "next";

/**
 * 검색엔진에 공개할 페이지와 막을 페이지를 구분한다.
 *
 * 원칙: 사용자 개인 데이터나 계산 결과가 표시될 수 있는 모든 페이지는
 * 기본적으로 검색 노출을 막는다 (사용자가 동의한 경우에만 검색 노출이
 * 가능해야 한다는 요구사항 반영). 현재는 "공개 동의" 기능 자체가 없으므로,
 * 개인 데이터가 없는 홈/로그인/친구초대안내 페이지만 공개하고 나머지는
 * 전부 비공개로 시작한다. 추후 "내 결과 공개하기" 동의 기능을 추가하면
 * 그 페이지만 별도로 허용하면 된다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
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
