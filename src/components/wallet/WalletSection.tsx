"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import {
  getWalletBalances,
  getWalletTransactions,
  getProductPrices,
  ProductPrice,
  WalletTransaction,
} from "@/lib/wallet";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const TX_LABEL: Record<WalletTransaction["type"], string> = {
  charge: "충전",
  spend: "사용",
  ad_reward: "광고 적립",
  refund: "지급",
};

/**
 * 대시보드 내 "보유 자산" 섹션. 잔액 표시는 wallets 테이블 조회(RLS로
 * 본인만 조회 가능)만 사용하며, 잔액 변경은 이 컴포넌트에서 직접 하지
 * 않고 RewardedAdButton이나 충전 화면으로 위임한다.
 *
 * 보석(충전으로 채움)과 별조각(웰컴·미션·광고로 받음)을 구분해서
 * 보여준다 — 별조각은 AI 원가가 있는 상품(정밀리포트 등)에는 쓸 수
 * 없다는 걸 사용자가 알 수 있게 하기 위함.
 */
export function WalletSection() {
  const [gemBalance, setGemBalance] = useState(0);
  const [starBalance, setStarBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    Promise.all([getWalletBalances(), getWalletTransactions(5), getProductPrices()]).then(
      ([balances, tx, priceList]) => {
        if (cancelled) return;
        setGemBalance(balances?.cashBalance ?? 0);
        setStarBalance(balances?.bonusBalance ?? 0);
        setTransactions(tx);
        setPrices(priceList);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isSupabaseConfigured() || loading) return null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>보유 자산</CardTitle>
        <Link href="/charge">
          <Button variant="secondary">충전하기</Button>
        </Link>
      </div>

      <div className="mt-3 flex gap-5">
        <div>
          <p className="text-xs text-muted">보석</p>
          <p className="text-xl font-semibold text-foreground">{gemBalance.toLocaleString()}개</p>
        </div>
        <div>
          <p className="text-xs text-muted">별조각</p>
          <p className="text-xl font-semibold text-foreground">{starBalance.toLocaleString()}개</p>
        </div>
      </div>

      {starBalance > 0 && (
        <p className="mt-2 text-xs text-muted">
          별조각은 오늘의 카드 같은 무료 콘텐츠에 쓸 수 있어요. 정밀 리포트 등 AI 분석
          콘텐츠는 보석으로만 결제할 수 있어요.
        </p>
      )}

      {prices.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <CardDescription>이용 가능한 콘텐츠</CardDescription>
          {prices.map((p) => (
            <div key={p.product_code} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{p.display_name}</span>
              <span className="text-muted">
                보석 {p.cash_price.toLocaleString()}개
                {p.ad_unlockable && " (광고로 무료 해제 가능)"}
              </span>
            </div>
          ))}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
          <CardDescription>최근 거래 내역</CardDescription>
          {transactions.map((tx) => (
            <div key={tx.id} className="flex justify-between text-xs text-muted">
              <span>
                {new Date(tx.created_at).toLocaleDateString("ko-KR")} {TX_LABEL[tx.type]}
              </span>
              <span>
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
