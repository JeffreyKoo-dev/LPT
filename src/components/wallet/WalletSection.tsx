"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import {
  getWalletBalance,
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
  refund: "환불",
};

/**
 * 대시보드 내 "캐시" 섹션. 잔액 표시는 wallets 테이블 조회(RLS로 본인만
 * 조회 가능)만 사용하며, 잔액 변경은 이 컴포넌트에서 직접 하지 않고
 * RewardedAdButton이나 충전 화면으로 위임한다.
 */
export function WalletSection() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    Promise.all([getWalletBalance(), getWalletTransactions(5), getProductPrices()]).then(
      ([bal, tx, priceList]) => {
        if (cancelled) return;
        setBalance(bal);
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
        <div>
          <CardTitle>보유 캐시</CardTitle>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {(balance ?? 0).toLocaleString()} 캐시
          </p>
        </div>
        <Button variant="secondary">충전하기</Button>
      </div>

      {prices.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <CardDescription>이용 가능한 콘텐츠</CardDescription>
          {prices.map((p) => (
            <div key={p.product_code} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{p.display_name}</span>
              <span className="text-muted">
                {p.cash_price.toLocaleString()}캐시
                {p.ad_unlockable && " · 광고로 무료 해제 가능"}
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
                {new Date(tx.created_at).toLocaleDateString("ko-KR")} · {TX_LABEL[tx.type]}
              </span>
              <span>
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toLocaleString()}캐시
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
