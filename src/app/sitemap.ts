import type { MetadataRoute } from "next";
import { LPT_TYPES } from "@/data/lptTypes";

/** 공개 검색 노출 대상: 홈페이지 + 유형 소개 페이지 12개 (robots.ts와 일관되게 유지) */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://questofme.com",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...LPT_TYPES.map((type) => ({
      url: `https://questofme.com/types/${type.id.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
