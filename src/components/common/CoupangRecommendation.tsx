"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/common/Card";
import { CoupangDisclosure } from "@/components/common/CoupangDisclosure";
import {
  searchCoupangProducts,
  CoupangProduct,
  isCoupangAffiliateUrl,
  AFFILIATE_LINK_REL,
} from "@/lib/coupang";
import { ShoppingItem } from "@/data/shoppingItems";
import { cn } from "@/lib/utils";

interface CoupangRecommendationProps {
  item: ShoppingItem;
  /**
   * true면 쿠팡 파트너스 API(Edge Function 캐시)로 실시간 상품을 찾아 우선 노출한다.
   * 비로그인 방문자가 많은 공개 페이지(홈)에서는 방문마다 백엔드를 호출하지 않도록
   * false로 두고, 큐레이션된 제휴 링크(affiliateUrl)만 쓴다.
   */
  live?: boolean;
  /** true면 자체 Card로 감싸 단독 섹션으로 쓰고, false면 다른 카드 안의 블록으로 쓴다 */
  standalone?: boolean;
  className?: string;
}

/**
 * "오늘의 추천 아이템" 블록. 대시보드·결과·홈에서 같은 모양으로 재사용한다.
 *
 * 쿠팡 파트너스 가이드에 따라 제휴 링크가 있을 때만 `[광고]` 라벨과 대가성 문구를
 * 링크 "위"에 강조해서 표시한다(링크 아래·분리 표기는 가이드 위반).
 */
export function CoupangRecommendation({
  item,
  live = true,
  standalone = false,
  className,
}: CoupangRecommendationProps) {
  // 키워드별 조회 결과를 키워드와 함께 저장해, effect 안에서 동기 setState 없이도
  // 키워드가 바뀌면 이전 결과를 자동으로 무시한다.
  const [lookup, setLookup] = useState<{ keyword: string; product: CoupangProduct | null } | null>(
    null
  );

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    searchCoupangProducts(item.searchKeyword).then((results) => {
      if (!cancelled) setLookup({ keyword: item.searchKeyword, product: results[0] ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, [live, item.searchKeyword]);

  const liveProduct = live && lookup?.keyword === item.searchKeyword ? lookup.product : null;
  const hasAffiliateLink = !!liveProduct || isCoupangAffiliateUrl(item.affiliateUrl);

  const body = (
    <>
      <p className="text-xs text-growth">
        {hasAffiliateLink && "[광고] "}오늘의 추천 아이템
      </p>
      {/* 쿠팡 가이드: 문구는 제휴 링크 "위"(콘텐츠 첫 부분)에, 본문보다 눈에 띄게 */}
      {hasAffiliateLink && <CoupangDisclosure variant="prominent" className="mt-1.5" />}
      {liveProduct ? (
        <a
          href={liveProduct.productUrl}
          target="_blank"
          rel={AFFILIATE_LINK_REL}
          className="mt-1 flex items-center gap-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 쿠팡 외부 이미지라 next/image 도메인 설정 없이 바로 사용 */}
          <img
            src={liveProduct.productImage}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{liveProduct.productName}</p>
            <p className="mt-0.5 text-xs text-muted">
              {liveProduct.productPrice.toLocaleString()}원
              {liveProduct.isRocket && " (로켓배송)"}
            </p>
          </div>
        </a>
      ) : isCoupangAffiliateUrl(item.affiliateUrl) ? (
        <>
          <p className="mt-1 text-sm font-medium text-foreground">{item.name}</p>
          <p className="mt-0.5 text-xs text-muted">{item.blurb}</p>
          <a
            href={item.affiliateUrl}
            target="_blank"
            rel={AFFILIATE_LINK_REL}
            className="mt-2 inline-block text-xs font-medium text-fate underline underline-offset-2"
          >
            쿠팡에서 둘러보기
          </a>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm font-medium text-foreground">{item.name}</p>
          <p className="mt-0.5 text-xs text-muted">{item.blurb}</p>
          <p className="mt-1 text-xs text-muted">둘러보기 링크 준비 중</p>
        </>
      )}
    </>
  );

  if (standalone) {
    return <Card className={cn("px-5 py-5", className)}>{body}</Card>;
  }

  return (
    <div className={cn("rounded-lg border border-border bg-surface-2 px-3 py-3", className)}>
      {body}
    </div>
  );
}
