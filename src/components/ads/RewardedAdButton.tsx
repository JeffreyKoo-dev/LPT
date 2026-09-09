// src/components/ads/RewardedAdButton.tsx
// "광고 보고 무료로 열기" / "광고 보고 캐시 받기" 버튼.
// ad_unlockable=false인 상품에는 이 버튼을 아예 렌더링하지 말 것 (부모 컴포넌트에서 필터링).

"use client";

import { useState } from "react";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { claimAdCashReward, unlockDailyContent, ProductCode } from "@/lib/wallet";

type Props =
  | { mode: "cash_reward"; rewardAmount?: number; productCode?: never; onSuccess: (newBalance: number) => void }
  | { mode: "content_unlock"; productCode: ProductCode; rewardAmount?: never; onSuccess: (newBalance: number) => void };

export function RewardedAdButton(props: Props) {
  const { status, showRewardedAd } = useRewardedAd();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setError(null);
    setBusy(true);

    await showRewardedAd(async () => {
      try {
        if (props.mode === "cash_reward") {
          const result = await claimAdCashReward(props.rewardAmount ?? 100);
          props.onSuccess(result.newBalance);
        } else {
          const result = await unlockDailyContent(props.productCode, "ad");
          props.onSuccess(result.newBalance);
        }
      } catch (err) {
        // 서버가 하루 3회 상한 등을 이유로 거부한 경우 여기로 들어옴
        setError(err instanceof Error ? err.message : "리워드 지급에 실패했습니다");
      } finally {
        setBusy(false);
      }
    });

    // 사용자가 광고를 끝까지 보지 않고 닫은 경우
    if (status === "closed_without_reward") {
      setBusy(false);
    }
  };

  const label =
    props.mode === "cash_reward"
      ? `광고 보고 ${props.rewardAmount ?? 100}캐시 받기`
      : "광고 보고 무료로 열기";

  return (
    <div>
      <button onClick={handleClick} disabled={busy} type="button">
        {busy ? "광고 준비 중..." : label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
