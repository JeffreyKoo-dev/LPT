"use client";

import { useSyncExternalStore } from "react";
import { CoupangRecommendation } from "@/components/common/CoupangRecommendation";
import { getDailyAnyShoppingItem, SHOPPING_ITEMS } from "@/data/shoppingItems";

const subscribeNoop = () => () => {};

/**
 * 로그인·분석 결과 없이도 보이는 공개 페이지(홈)용 "오늘의 추천 아이템".
 * 오행 정보가 없으므로 전체 큐레이션 중 오늘 날짜로 하나를 순환 노출한다.
 *
 * 홈은 빌드 시점에 정적으로 만들어지므로 날짜 기반 선택은 브라우저에서 해야 한다.
 * 서버 HTML에는 고정 기본 아이템(제휴 링크 + 대가성 문구 포함)을 넣고, 마운트 후
 * 오늘의 아이템으로 바꾼다. 이렇게 하면 하이드레이션 불일치가 없고, 스크립트 실행
 * 전에도 대가성 문구가 링크와 함께 보인다.
 */
export function DailyCoupangPick() {
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const item = mounted ? getDailyAnyShoppingItem() : SHOPPING_ITEMS[0];

  return <CoupangRecommendation item={item} live={false} standalone />;
}
