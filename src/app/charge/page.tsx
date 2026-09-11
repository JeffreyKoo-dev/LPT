"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/common/PageHeading";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { GuardScreen } from "@/components/common/GuardScreen";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { createPendingOrder } from "@/lib/wallet";
import { CHARGE_OPTIONS } from "@/lib/chargeOptions";
import {
  initChargeWidgets,
  isTossPaymentsConfigured,
  PAYMENT_METHOD_SELECTOR,
  AGREEMENT_SELECTOR,
  TossWidgets,
} from "@/lib/tossPayments";

export default function ChargePage() {
  const router = useRouter();
  const authGate = useRequireLogin();
  const [selected, setSelected] = useState<number | null>(null);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "rendering" | "paying">("idle");
  const [error, setError] = useState<string | null>(null);

  const widgetsRef = useRef<TossWidgets | null>(null);
  const orderIdRef = useRef<string | null>(null);
  const customerKeyRef = useRef<string>(crypto.randomUUID());

  // 금액을 선택하면, 그 금액으로 결제수단·약관 UI를 새로 렌더링한다.
  useEffect(() => {
    if (!selected || !isTossPaymentsConfigured()) return;

    let cancelled = false;
    setWidgetsReady(false);
    setStatus("rendering");
    setError(null);

    initChargeWidgets({ customerKey: customerKeyRef.current, amount: selected })
      .then((widgets) => {
        if (cancelled) return;
        widgetsRef.current = widgets;
        setWidgetsReady(true);
        setStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "결제 UI를 불러오지 못했어요.");
        setStatus("idle");
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

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

  async function handlePay() {
    if (!selected || !widgetsRef.current) return;
    setError(null);
    setStatus("paying");
    try {
      const order = await createPendingOrder(selected);
      if (!order) throw new Error("주문 생성에 실패했어요.");
      orderIdRef.current = order.orderId;

      await widgetsRef.current.requestPayment({
        orderId: order.orderId,
        orderName: `LPT 캐시 충전 ${CHARGE_OPTIONS[selected].toLocaleString()}캐시`,
        successUrl: `${window.location.origin}/charge/success`,
        failUrl: `${window.location.origin}/charge/fail`,
      });
      // 성공 시 브라우저가 successUrl로 이동하므로 이 아래 코드는 보통 실행되지 않는다.
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제 요청에 실패했어요.");
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

        {/* 토스페이먼츠 결제수단·약관 UI가 렌더링되는 자리. 금액 선택 전에는 비어있다. */}
        {selected && (
          <div className="mt-5 border-t border-border pt-5">
            <div id={PAYMENT_METHOD_SELECTOR.slice(1)} />
            <div id={AGREEMENT_SELECTOR.slice(1)} className="mt-3" />
            {status === "rendering" && (
              <p className="mt-2 text-xs text-muted">결제 수단을 불러오는 중…</p>
            )}
          </div>
        )}

        <Button
          className="mt-5 w-full"
          onClick={handlePay}
          disabled={!selected || !widgetsReady || status === "paying"}
        >
          {status === "paying" ? "결제 요청 중…" : "결제하기"}
        </Button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </Card>
    </div>
  );
}
