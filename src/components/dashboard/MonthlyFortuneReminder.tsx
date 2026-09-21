"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { hasPurchasedThisMonth } from "@/lib/premiumContent";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * "이번 달 운세"는 매달 다시 결제해야 하는 반복 수익 핵심 상품이지만,
 * 사용자가 단순히 잊어버려서 재구매 안 하는 경우가 많을 수 있다. 대시보드에
 * 자연스러운 리마인더를 띄워, 잊어버림으로 인한 재구매율 하락을 줄인다.
 * 이미 이번 달에 구매했으면 아무것도 렌더링하지 않는다.
 */
export function MonthlyFortuneReminder() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    hasPurchasedThisMonth("monthly_fortune").then((purchased) => {
      setShow(!purchased);
    });
  }, []);

  if (!show) return null;

  return (
    <Card variant="ledger">
      <CardTitle>이번 달 운세, 아직 안 보셨네요</CardTitle>
      <CardDescription className="mt-1">
        매달 새로 바뀌는 흐름이라, 지난달과는 또 다른 이야기가 기다리고 있을 수 있어요.
      </CardDescription>
      <Button className="mt-3 w-full" onClick={() => router.push("/result")}>
        이번 달 운세 보러가기
      </Button>
    </Card>
  );
}
