"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { purchaseProduct, getProductPrices, getProductPrice, ProductCode, ProductPrice } from "@/lib/wallet";
import { hasPurchased, getCachedContent, generatePremiumContent, PremiumContent } from "@/lib/premiumContent";
import { isSupabaseConfigured } from "@/lib/supabase/client";

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
}

type Stage = "checking" | "locked" | "unlockedNoContent" | "generating" | "content" | "error";

export function PremiumUnlockCard({
  productCode,
  title,
  teaser,
  buildContext,
  noCache = false,
}: PremiumUnlockCardProps) {
  const [stage, setStage] = useState<Stage>("checking");
  const [content, setContent] = useState<PremiumContent | null>(null);
  const [price, setPrice] = useState<ProductPrice | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStage("error");
      setErrorMessage("로그인 후 이용할 수 있는 기능이에요.");
      return;
    }

    Promise.all([hasPurchased(productCode), getProductPrices()]).then(([purchased, prices]) => {
      setPrice(getProductPrice(prices, productCode));
      if (!purchased) {
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
  }, [productCode, noCache]);

  async function handlePurchase() {
    setErrorMessage(null);
    setStage("generating");
    try {
      await purchaseProduct(productCode);
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
          <Button className="mt-4 w-full" onClick={handlePurchase}>
            {price ? `${price.cash_price.toLocaleString()}캐시로 열어보기` : "열어보기"}
          </Button>
          {errorMessage && <p className="mt-2 text-xs text-red-600">{errorMessage}</p>}
        </>
      )}

      {stage === "generating" && <p className="mt-2 text-sm text-muted">생성하는 중이에요…</p>}

      {stage === "unlockedNoContent" && (
        <>
          <CardDescription className="mt-2">{teaser}</CardDescription>
          <Button className="mt-4 w-full" onClick={handleGenerate}>
            {noCache ? "결과 보기" : "다시 생성하기"}
          </Button>
          {errorMessage && <p className="mt-2 text-xs text-red-600">{errorMessage}</p>}
        </>
      )}

      {stage === "content" && content && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{content.text}</p>
      )}

      {stage === "error" && <p className="mt-2 text-sm text-muted">{errorMessage}</p>}
    </Card>
  );
}
