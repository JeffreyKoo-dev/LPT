"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { InlineError } from "@/components/common/InlineError";
import { ShortageNotice } from "@/components/wallet/ShortageNotice";
import { getProductPrices, getProductPrice, purchaseNewYearPack } from "@/lib/wallet";
import { hasPurchasedThisYear } from "@/lib/premiumContent";
import { checkShortage, Shortage } from "@/lib/shortage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getFortuneYear } from "@/lib/kst";
import { track } from "@/lib/analytics";
import { WITHDRAWAL_NOTICE } from "@/data/refundPolicy";

/**
 * 신년 패키지(신년운세 + 궁합 심화 1회) 구매 카드. product_prices의 newyear_pack이 활성일 때만,
 * 그리고 이번 해 신년운세를 아직 사지 않았을 때만 보인다. 구매하면 onPurchased를 불러
 * 상위 화면이 신년운세 카드를 다시 열어(곧바로 생성) 보여줄 수 있게 한다.
 */
export function NewYearPackCard({ onPurchased }: { onPurchased: () => void }) {
  const [price, setPrice] = useState<number | null>(null);
  // 패키지를 따로 샀을 때의 합계(신년운세 + 궁합 심화) — 할인 안내용
  const [separateTotal, setSeparateTotal] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [shortage, setShortage] = useState<Shortage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    Promise.all([getProductPrices(), hasPurchasedThisYear("yearly_fortune")]).then(([prices, purchased]) => {
      if (cancelled) return;
      const pack = getProductPrice(prices, "newyear_pack");
      if (pack && !purchased) {
        setPrice(pack.cash_price);
        const yearly = getProductPrice(prices, "yearly_fortune");
        const compat = getProductPrice(prices, "compatibility_deep");
        if (yearly && compat) setSeparateTotal(yearly.cash_price + compat.cash_price);
        setVisible(true);
        track("unlock_impression", { product: "newyear_pack" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || price === null) return null;

  async function handleOpen() {
    setError(null);
    const missing = await checkShortage(price!, false);
    if (missing) {
      setShortage(missing);
      track("unlock_insufficient", { product: "newyear_pack", shortage: missing.amount });
      return;
    }
    setShortage(null);
    setConfirming(true);
    track("unlock_confirm_open", { product: "newyear_pack" });
  }

  async function handleBuy() {
    setBusy(true);
    setError(null);
    try {
      await purchaseNewYearPack();
      track("unlock_purchased", { product: "newyear_pack" });
      setDone(true);
      setConfirming(false);
      onPurchased();
    } catch (err) {
      setError(err instanceof Error ? err.message : "구매에 실패했어요.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  const year = getFortuneYear();

  if (done) {
    return (
      <Card variant="ledger">
        <CardTitle>신년 패키지를 받았어요</CardTitle>
        <CardDescription className="mt-2">
          {year}년 신년운세를 아래에서 바로 열어볼 수 있어요. 궁합 심화 1회권은{" "}
          <Link href="/compatibility" className="underline underline-offset-2">
            궁합 보기
          </Link>
          에서 사용할 수 있어요.
        </CardDescription>
      </Card>
    );
  }

  return (
    <Card variant="ledger">
      <CardTitle>{year}년 신년 패키지</CardTitle>
      <CardDescription className="mt-2">
        {year}년 신년운세와 궁합 심화 1회권을 함께 담았어요.{" "}
        {separateTotal !== null && separateTotal > price
          ? `따로 사면 ${separateTotal.toLocaleString()}개인 구성을 ${price.toLocaleString()}개에 만나보세요. `
          : ""}
        신년 시즌에만 판매해요.
      </CardDescription>

      {shortage ? (
        <ShortageNotice shortage={shortage} onClose={() => setShortage(null)} />
      ) : !confirming ? (
        <Button className="mt-4 w-full" onClick={handleOpen}>
          보석 {price.toLocaleString()}개로 받기
        </Button>
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
          <p className="break-keep text-sm font-medium text-foreground">결제 전에 확인해 주세요</p>
          <p className="mt-1 break-keep text-xs leading-relaxed text-muted">
            {WITHDRAWAL_NOTICE}{" "}
            <Link href="/refund" className="underline underline-offset-2">
              환불 안내 보기
            </Link>
          </p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={handleBuy} disabled={busy}>
              {busy ? "처리 중…" : "확인하고 받기"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              취소
            </Button>
          </div>
        </div>
      )}
      {error && <InlineError>{error}</InlineError>}
    </Card>
  );
}
