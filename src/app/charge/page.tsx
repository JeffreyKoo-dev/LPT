"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/common/PageHeading";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { GuardScreen } from "@/components/common/GuardScreen";
import { InlineError } from "@/components/common/InlineError";
import { Clock } from "lucide-react";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { createPendingOrder } from "@/lib/wallet";
import { getChargeOptions, ChargeOption } from "@/lib/chargeOptions";
import { getSupabaseClient } from "@/lib/supabase/client";
import { REFUND_POLICY } from "@/data/refundPolicy";
import {
  initChargeWidgets,
  isTossPaymentsConfigured,
  PAYMENT_METHOD_SELECTOR,
  AGREEMENT_SELECTOR,
  TossWidgets,
} from "@/lib/tossPayments";

/** supabase/migrations/031_first_charge_bonus.sql의 v_first_bonus와 같은 값으로 유지 */
const FIRST_CHARGE_BONUS = REFUND_POLICY.firstChargeBonus;

export default function ChargePage() {
  const router = useRouter();
  const authGate = useRequireLogin();
  const [selected, setSelected] = useState<number | null>(null);
  const [chargeOptions, setChargeOptions] = useState<ChargeOption[]>([]);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "rendering" | "paying">("idle");
  const [error, setError] = useState<string | null>(null);
  // null = 확인 전. true면 아직 한 번도 결제한 적 없는 사용자(첫 결제 보너스 대상)
  const [isFirstCharge, setIsFirstCharge] = useState<boolean | null>(null);

  const widgetsRef = useRef<TossWidgets | null>(null);
  const orderIdRef = useRef<string | null>(null);
  const customerKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    getChargeOptions(getSupabaseClient())
      .then(setChargeOptions)
      .catch((err) => setError(err instanceof Error ? err.message : "충전 옵션을 불러오지 못했어요."));
  }, []);

  useEffect(() => {
    getSupabaseClient()
      .from("wallet_transactions")
      .select("id", { head: true, count: "exact" })
      .eq("type", "charge")
      .then(({ count, error: queryError }: { count: number | null; error: unknown }) => {
        if (!queryError) setIsFirstCharge((count ?? 0) === 0);
      });
  }, []);

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
        icon={Clock}
        title="보석 충전 준비 중이에요"
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
        orderName: `LPT 보석 충전 ${chargeOptions.find((o) => o.krwAmount === selected)?.cashAmount.toLocaleString() ?? ""}개`,
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
      <PageHeading label="보석 충전" title="필요한 만큼 채워보세요" />

      <Card>
        {isFirstCharge && (
          <p className="mb-4 break-keep rounded-lg bg-growth-soft px-3 py-2 text-sm font-semibold text-growth">
            첫 결제 기념! 어떤 금액이든 별조각 {FIRST_CHARGE_BONUS}개를 추가로 드려요.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {chargeOptions.map(({ krwAmount, cashAmount }) => {
            const bonus = cashAmount - krwAmount;
            return (
              <button
                key={krwAmount}
                onClick={() => setSelected(krwAmount)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  selected === krwAmount
                    ? "border-fate bg-fate-soft"
                    : "border-border bg-surface-2 hover:border-fate/40"
                }`}
              >
                <span className="font-medium text-foreground">{krwAmount.toLocaleString()}원</span>
                <span className="text-sm text-muted">
                  {cashAmount.toLocaleString()}개
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
        {error && <InlineError>{error}</InlineError>}

        <div className="mt-4 break-keep text-xs leading-relaxed text-muted">
          <p>
            결제일로부터 {REFUND_POLICY.windowDays}일 이내에 보석을 쓰지 않았다면 전액 환불할 수 있어요. 일부를
            사용했거나 AI 콘텐츠 생성이 시작된 부분은 환불이 제한될 수 있어요.
            {isFirstCharge && " 첫 결제 보너스는 환불 시 함께 회수돼요."}
          </p>
          <p className="mt-1">
            결제를 진행하면{" "}
            <Link href="/terms" className="underline underline-offset-2">이용약관</Link>과{" "}
            <Link href="/refund" className="underline underline-offset-2">환불 안내</Link>에 동의한 것으로 봅니다.
          </p>
        </div>
      </Card>
    </div>
  );
}
