"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/common/PageHeading";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { GuardScreen } from "@/components/common/GuardScreen";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { createPendingOrder } from "@/lib/wallet";
import { CHARGE_OPTIONS } from "@/lib/chargeOptions";
import { startCharge, isTossPaymentsConfigured } from "@/lib/tossPayments";

export default function ChargePage() {
  const router = useRouter();
  const authGate = useRequireLogin();
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "starting">("idle");
  const [error, setError] = useState<string | null>(null);

  if (authGate.configured && (authGate.loading || authGate.redirecting)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        로그인 확인 중입니다…
      </div>
    );
  }

  if (!isTossPaymentsConfigured()) {
    return (
      <GuardScreen
        title="캐시 충전 준비 중이에요"
        description="결제 기능이 아직 연결되지 않았어요. 조금만 기다려주세요."
        actionLabel="대시보드로"
        onAction={() => router.push("/dashboard")}
      />
    );
  }

  async function handleCharge() {
    if (!selected) return;
    setError(null);
    setStatus("starting");
    try {
      const order = await createPendingOrder(selected);
      if (!order) throw new Error("주문 생성에 실패했어요.");

      await startCharge({
        orderId: order.orderId,
        amount: selected,
        orderName: `LPT 캐시 충전 ${CHARGE_OPTIONS[selected].toLocaleString()}캐시`,
        customerKey: order.orderId, // 별도 회원 식별자 없이, 주문 단위로 충분
      });
      // 성공 시 브라우저가 successUrl로 이동하므로 이 아래 코드는 보통 실행되지 않는다.
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제 시작에 실패했어요.");
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <PageHeading label="캐시 충전" title="필요한 만큼 채워보세요" />

      <Card>
        <div className="flex flex-col gap-2">
          {Object.entries(CHARGE_OPTIONS).map(([krw, cash]) => {
            const krwNum = Number(krw);
            const bonus = cash - krwNum;
            return (
              <button
                key={krw}
                onClick={() => setSelected(krwNum)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  selected === krwNum
                    ? "border-fate bg-fate-soft"
                    : "border-border bg-surface-2 hover:border-fate/40"
                }`}
              >
                <span className="font-medium text-foreground">{krwNum.toLocaleString()}원</span>
                <span className="text-sm text-muted">
                  {cash.toLocaleString()}캐시
                  {bonus > 0 && <span className="ml-1 text-growth">(+{bonus.toLocaleString()} 보너스)</span>}
                </span>
              </button>
            );
          })}
        </div>

        <Button className="mt-5 w-full" onClick={handleCharge} disabled={!selected || status === "starting"}>
          {status === "starting" ? "결제창 여는 중…" : "결제하기"}
        </Button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </Card>
    </div>
  );
}
