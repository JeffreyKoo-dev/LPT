import type { MetadataRoute } from "next";

/** 공개 검색 노출 대상은 홈페이지뿐이다 (robots.ts와 일관되게 유지) */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://questofme.com",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
