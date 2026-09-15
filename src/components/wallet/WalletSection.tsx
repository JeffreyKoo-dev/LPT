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
  refund: "환불",
};

/**
 * 대시보드 내 "캐시" 섹션. 잔액 표시는 wallets 테이블 조회(RLS로 본인만
 * 조회 가능)만 사용하며, 잔액 변경은 이 컴포넌트에서 직접 하지 않고
 * RewardedAdButton이나 충전 화면으로 위임한다.
 *
 * 실제캐시(충전)와 보너스캐시(웰컴·미션·광고)를 구분해서 보여준다 —
 * 보너스캐시는 AI 원가가 있는 상품(정밀리포트 등)에는 쓸 수 없다는 걸
 * 사용자가 알 수 있게 하기 위함.
 */
export function WalletSection() {
  const [cashBalance, setCashBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
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
        setCashBalance(balances?.cashBalance ?? 0);
        setBonusBalance(balances?.bonusBalance ?? 0);
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
            {(cashBalance + bonusBalance).toLocaleString()} 캐시
          </p>
          <p className="mt-0.5 text-xs text-muted">
            실제캐시 {cashBalance.toLocaleString()} · 보너스캐시 {bonusBalance.toLocaleString()}
          </p>
        </div>
        <Link href="/charge">
          <Button variant="secondary">충전하기</Button>
        </Link>
      </div>

      {bonusBalance > 0 && (
        <p className="mt-2 text-xs text-muted">
          보너스캐시는 오늘의 카드 같은 무료 콘텐츠에 쓸 수 있어요. 정밀 리포트 등 AI 분석
          콘텐츠는 실제캐시로만 결제할 수 있어요.
        </p>
      )}

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
