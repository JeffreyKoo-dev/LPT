"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { getProductPrices, getProductPrice } from "@/lib/wallet";
import { hasPurchasedThisYear } from "@/lib/premiumContent";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getFortuneYear, getKstDate } from "@/lib/kst";
import { getYearGanzhiName } from "@/lib/fortuneYear";

/**
 * 신년 시즌(12월~2월 중순) 대시보드 배너. 신년 패키지가 활성(product_prices.is_active)이고
 * 이번 해 신년운세를 아직 사지 않은 사람에게만 보인다. 시즌 종료는 패키지를 비활성으로 돌리면 끝난다.
 */
export function NewYearBanner() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    Promise.all([getProductPrices(), hasPurchasedThisYear("yearly_fortune")]).then(([prices, purchased]) => {
      setShow(!!getProductPrice(prices, "newyear_pack") && !purchased);
    });
  }, []);

  if (!show) return null;

  const year = getFortuneYear();
  // 새해가 이미 시작됐으면(1월 이후) "새해 운세"로, 12월이면 "다가오는 해"로 안내한다.
  const upcoming = getKstDate().month === 12;

  return (
    <Card variant="ledger">
      <CardTitle>
        {year}년({getYearGanzhiName(year)}) 신년운세가 열렸어요
      </CardTitle>
      <CardDescription className="mt-1">
        {upcoming ? "다가오는 한 해" : "올 한 해"}의 흐름을 총운과 월별로 풀어드려요. 신년 패키지로 궁합 심화 1회권까지
        함께 받아보세요.
      </CardDescription>
      <Button className="mt-3 w-full" onClick={() => router.push("/result")}>
        신년운세 보러가기
      </Button>
    </Card>
  );
}
