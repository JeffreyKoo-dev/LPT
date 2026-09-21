"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { getActivePassExpiry, purchaseWeeklyPass } from "@/lib/weeklyPass";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/** 오늘의 카드를 매일 별도 결제/광고 없이 쓸 수 있는 주간 이용권 상태 + 구매. */
export function WeeklyPassSection() {
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "buying">("idle");
  const [error, setError] = useState<string | null>(null);

  function applyExpiry(d: Date | null) {
    setExpiresAt(d);
    setDaysLeft(d ? Math.max(0, Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0);
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    getActivePassExpiry().then((d) => {
      applyExpiry(d);
      setLoading(false);
    });
  }, []);

  async function handlePurchase() {
    setError(null);
    setStatus("buying");
    try {
      const { expiresAt: newExpiry } = await purchaseWeeklyPass();
      applyExpiry(newExpiry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "구매에 실패했어요.");
    } finally {
      setStatus("idle");
    }
  }

  if (!isSupabaseConfigured() || loading) return null;

  return (
    <Card>
      <CardTitle>주간 이용권</CardTitle>
      <CardDescription className="mt-1">
        이용권이 있는 동안은 오늘의 카드를 결제·광고 없이 매일 바로 볼 수 있어요.
      </CardDescription>
      {expiresAt ? (
        <p className="mt-3 text-sm text-foreground">이용 중 (D-{daysLeft})</p>
      ) : (
        <p className="mt-3 text-sm text-muted">지금은 이용권이 없어요.</p>
      )}
      <Button variant="secondary" className="mt-3 w-full" onClick={handlePurchase} disabled={status === "buying"}>
        {status === "buying" ? "처리 중…" : expiresAt ? "7일 연장하기" : "주간 이용권 구매하기"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
  );
}
