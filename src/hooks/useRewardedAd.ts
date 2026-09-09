// src/hooks/useRewardedAd.ts
// Google Ad Manager 리워드 광고 슬롯을 요청/재생하고,
// "완전 시청 완료(RewardedSlotGrantedEvent)"일 때만 onGranted 콜백을 호출한다.
//
// ⚠️ 보안 노트: 현재 구조는 클라이언트가 시청 완료를 신뢰하고 서버 RPC(grant_ad_cash_reward /
// unlock_daily_content)를 직접 호출하는 방식이다. 리워드 금액이 소액(100캐시)이고
// 서버에 하루 3회 상한이 걸려있어 초기 단계 리스크는 낮지만, 광고 매출 비중이 커지면
// Ad Manager의 Server-Side Verification(SSV)으로 전환해 "GAM 서버 → 우리 서버" 콜백만
// 신뢰하도록 강화할 것. (SSV는 GAM 네트워크 콘솔에서 리워드 광고 승인 + 검증 URL 등록 필요)

import { useCallback, useRef, useState } from "react";
import { loadGpt, GoogletagRewardedSlot, GoogletagEvent } from "@/lib/ads/gpt";

const AD_UNIT_PATH =
  process.env.NEXT_PUBLIC_GAM_REWARDED_AD_UNIT ??
  "/YOUR_NETWORK_CODE/questofme_rewarded";

export type RewardedAdStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "granted"
  | "closed_without_reward"
  | "error";

export function useRewardedAd() {
  const [status, setStatus] = useState<RewardedAdStatus>("idle");
  const slotRef = useRef<GoogletagRewardedSlot | null>(null);
  const grantedRef = useRef(false);

  /** 광고를 요청하고 재생한다. 실제 시청 완료 시에만 onGranted가 호출됨. */
  const showRewardedAd = useCallback(async (onGranted: () => void | Promise<void>) => {
    setStatus("loading");
    grantedRef.current = false;

    try {
      await loadGpt();
      const googletag = window.googletag;

      googletag.cmd.push(() => {
        const slot = googletag.defineOutOfPageSlot(
          AD_UNIT_PATH,
          googletag.enums.OutOfPageFormat.REWARDED
        );

        if (!slot) {
          // 리워드 광고를 지원하지 않는 페이지 조건 (뷰포트 meta 누락 등)
          setStatus("error");
          return;
        }

        slotRef.current = slot;
        slot.addService(googletag.pubads());

        googletag.pubads().addEventListener("rewardedSlotReady", (event: GoogletagEvent) => {
          setStatus("ready");
          event.makeRewardedVisible();
          setStatus("playing");
        });

        googletag.pubads().addEventListener("rewardedSlotGranted", async () => {
          grantedRef.current = true;
          setStatus("granted");
          await onGranted();
        });

        googletag.pubads().addEventListener("rewardedSlotClosed", () => {
          if (!grantedRef.current) {
            setStatus("closed_without_reward");
          }
          if (slotRef.current) {
            googletag.destroySlots([slotRef.current]);
          }
          slotRef.current = null;
        });

        googletag.enableServices();
        googletag.display(slot);
      });
    } catch (err) {
      console.error("리워드 광고 로드 실패:", err);
      setStatus("error");
    }
  }, []);

  return { status, showRewardedAd };
}
