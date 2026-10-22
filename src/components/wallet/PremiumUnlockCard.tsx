"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { InlineError } from "@/components/common/InlineError";
import { purchaseProduct, getProductPrices, getProductPrice, getWalletBalances, ProductCode, ProductPrice } from "@/lib/wallet";
import { getChargeOptions, ChargeOption } from "@/lib/chargeOptions";
import { saveChargeReturn } from "@/lib/chargeReturn";
import { track } from "@/lib/analytics";
import {
  hasPurchased,
  hasPurchasedThisMonth,
  hasPurchasedThisYear,
  getCachedContent,
  generatePremiumContent,
  PremiumContent,
} from "@/lib/premiumContent";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { WITHDRAWAL_NOTICE } from "@/data/refundPolicy";

interface PremiumUnlockCardProps {
  productCode: ProductCode;
  title: string;
  teaser: string;
  /** AI 생성에 쓰일 컨텍스트 데이터. 구매/생성 버튼을 누른 시점의 최신 값을 넘긴다. */
  buildContext: () => Record<string, unknown>;
  /**
   * true면(compatibility_deep 등) 서버에 결과를 저장하지 않고 매번 새로 생성한다.
   * false면(premium_report, daeun_seun 등) 한 번 생성한 뒤 재사용한다.
   */
  noCache?: boolean;
  /**
   * true면(monthly_fortune) "평생 한 번"이 아니라 "이번 달에 한 번" 결제
   * 여부를 확인한다 — 지난달에 결제했어도 이번 달은 다시 잠긴 상태로 보인다.
   */
  monthly?: boolean;
  /** true면(yearly_fortune) "올해에 한 번" 결제 여부를 확인한다 — monthly와 동일한 원리의 연 단위 버전. */
  yearly?: boolean;
  /**
   * 있으면 purchaseProduct(productCode) 대신 이 함수로 "구매됨" 처리를
   * 한다 (예: compatibility_deep을 궁합권으로 대신 소모하는 경우). 이
   * 함수가 실패(reject)하면 기존처럼 자산 부족 에러가 표시된다.
   */
  customPurchase?: () => Promise<void>;
  /** 있으면 "보석 N개로 열어보기" 대신 이 문구를 버튼에 쓴다 (예: 궁합권 보유 시 "궁합권으로 열어보기"). */
  purchaseButtonLabel?: string;
}

type Stage = "checking" | "locked" | "unlockedNoContent" | "generating" | "content" | "error";

export function PremiumUnlockCard({
  productCode,
  title,
  teaser,
  buildContext,
  noCache = false,
  monthly = false,
  yearly = false,
  customPurchase,
  purchaseButtonLabel,
}: PremiumUnlockCardProps) {
  const [stage, setStage] = useState<Stage>("checking");
  const [content, setContent] = useState<PremiumContent | null>(null);
  const [price, setPrice] = useState<ProductPrice | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 결제 직전 청약철회 제한 안내를 확인하는 단계(전자상거래법상 철회 제한은 사전 표시가 전제)
  const [confirming, setConfirming] = useState(false);
  // 보유 보석이 모자랄 때 채워야 하는 개수와 추천 충전 옵션 (null이면 부족하지 않음)
  const [shortage, setShortage] = useState<{ amount: number; option: ChargeOption | null } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStage("error");
      setErrorMessage("로그인 후 이용할 수 있는 기능이에요.");
      return;
    }

    const checkPurchased = monthly
      ? hasPurchasedThisMonth(productCode)
      : yearly
        ? hasPurchasedThisYear(productCode)
        : hasPurchased(productCode);

    Promise.all([checkPurchased, getProductPrices()]).then(([purchased, prices]) => {
      setPrice(getProductPrice(prices, productCode));
      if (!purchased) {
        track("unlock_impression", { product: productCode });
        setStage("locked");
        return;
      }
      if (noCache) {
        setStage("unlockedNoContent");
        return;
      }
      getCachedContent(productCode).then((cached) => {
        if (cached) {
          setContent(cached);
          setStage("content");
        } else {
          setStage("unlockedNoContent");
        }
      });
    });
  }, [productCode, noCache, monthly, yearly]);

  /** "열어보기"를 눌렀을 때: 보석이 모자라면 충전 안내를, 아니면 환불 고지 확인 단계를 연다. */
  async function handleOpenConfirm() {
    setErrorMessage(null);
    if (!customPurchase && price) {
      const balances = await getWalletBalances();
      if (balances) {
        // 광고로 해제 가능한 상품만 별조각을 쓸 수 있고, 나머지는 보석(cash)만 쓸 수 있다.
        const spendable = price.ad_unlockable ? balances.totalBalance : balances.cashBalance;
        const missing = price.cash_price - spendable;
        if (missing > 0) {
          const options = await getChargeOptions(getSupabaseClient()).catch(() => [] as ChargeOption[]);
          const option = options.find((o) => o.cashAmount >= missing) ?? options[options.length - 1] ?? null;
          setShortage({ amount: missing, option });
          track("unlock_insufficient", { product: productCode, shortage: missing });
          return;
        }
      }
    }
    setShortage(null);
    setConfirming(true);
    track("unlock_confirm_open", { product: productCode });
  }

  function handleGoCharge() {
    saveChargeReturn(window.location.pathname + window.location.search);
    router.push(shortage?.option ? `/charge?amount=${shortage.option.krwAmount}` : "/charge");
  }

  async function handlePurchase() {
    setErrorMessage(null);
    setConfirming(false);
    setStage("generating");
    try {
      if (customPurchase) {
        await customPurchase();
      } else {
        await purchaseProduct(productCode);
      }
      track("unlock_purchased", { product: productCode });
      await handleGenerate();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "구매에 실패했어요.");
      setStage("locked");
    }
  }

  async function handleGenerate() {
    setErrorMessage(null);
    setStage("generating");
    try {
      const result = await generatePremiumContent(productCode, buildContext());
      setContent(result);
      setStage("content");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "콘텐츠 생성에 실패했어요. 결제는 유지되니 다시 시도해주세요."
      );
      setStage("unlockedNoContent");
    }
  }

  if (stage === "checking") return null;

  return (
    <Card variant="ledger">
      <CardTitle>{title}</CardTitle>

      {stage === "locked" && (
        <>
          <CardDescription className="mt-2">{teaser}</CardDescription>
          {shortage ? (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
              <p className="break-keep text-sm font-medium text-foreground">
                보석이 {shortage.amount.toLocaleString()}개 부족해요
              </p>
              <p className="mt-1 break-keep text-xs leading-relaxed text-muted">
                {shortage.option
                  ? `${shortage.option.krwAmount.toLocaleString()}원을 충전하면 보석 ${shortage.option.cashAmount.toLocaleString()}개를 받아요. 충전이 끝나면 이 화면으로 바로 돌아와요.`
                  : "보석을 충전하면 바로 열어볼 수 있어요."}
              </p>
              <div className="mt-3 flex gap-2">
                <Button className="flex-1" onClick={handleGoCharge}>
                  {shortage.option ? `${shortage.option.krwAmount.toLocaleString()}원 충전하기` : "충전하러 가기"}
                </Button>
                <Button variant="ghost" onClick={() => setShortage(null)}>
                  닫기
                </Button>
              </div>
            </div>
          ) : !confirming ? (
            <Button className="mt-4 w-full" onClick={handleOpenConfirm}>
              {purchaseButtonLabel ?? (price ? `보석 ${price.cash_price.toLocaleString()}개로 열어보기` : "열어보기")}
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
                <Button className="flex-1" onClick={handlePurchase}>
                  확인하고 열어보기
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  취소
                </Button>
              </div>
            </div>
          )}
          {errorMessage && <InlineError>{errorMessage}</InlineError>}
        </>
      )}

      {stage === "generating" && <p className="mt-2 text-sm text-muted">생성하는 중이에요…</p>}

      {stage === "unlockedNoContent" && (
        <>
          <CardDescription className="mt-2">{teaser}</CardDescription>
          <Button className="mt-4 w-full" onClick={handleGenerate}>
            {noCache ? "결과 보기" : "다시 생성하기"}
          </Button>
          {errorMessage && <InlineError>{errorMessage}</InlineError>}
        </>
      )}

      {stage === "content" && content && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{content.text}</p>
      )}

      {stage === "error" && <p className="mt-2 text-sm text-muted">{errorMessage}</p>}
    </Card>
  );
}
