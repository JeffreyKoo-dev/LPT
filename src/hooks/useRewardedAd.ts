// src/hooks/useRewardedAd.ts
// Google Ad Manager 리워드 광고 슬롯을 요청/재생하고,
// "완전 시청 완료(RewardedSlotGrantedEvent)"일 때만 onGranted 콜백을 호출한다.
//
// ⚠️ 보안 노트: 현재 구조는 클라이언트가 시청 완료를 신뢰하고 서버 RPC(grant_ad_cash_reward /
// unlock_daily_content)를 직접 호출하는 방식이다. 리워드 금액이 소액(100캐시)이고
// 서버에 하루 3회 상한이 걸려있어 초기 단계 리스크는 낮다. 참고로 Ad Manager의
// Server-Side Verification(SSV)은 앱 전용이라 웹 리워드 광고에서는 쓸 수 없다(GAM 공식 문서).
// 웹에서는 서버 상한(일일 횟수)과 소액 보상으로 남용을 제한하는 방식이 최선이다.

import { useCallback, useRef, useState } from "react";
import { loadGpt, GoogletagRewardedSlot, GoogletagEvent } from "@/lib/ads/gpt";

/** 광고 요청 후 이 시간 안에 rewardedSlotReady가 오지 않으면 "채울 광고 없음"으로 본다 */
const NO_FILL_TIMEOUT_MS = 10_000;

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

  /**
   * 광고를 요청하고 재생한다. 실제 시청 완료 시에만 onGranted가 호출됨.
   * onClosedWithoutGrant는 사용자가 끝까지 보지 않고 광고를 닫았을 때 호출된다
   * (호출 측에서 버튼의 busy 상태를 풀어주는 용도 — googletag 이벤트는 비동기라
   * showRewardedAd 반환 직후의 status 값을 읽으면 항상 최신 상태가 아닐 수 있다).
   */
  const showRewardedAd = useCallback(
    async (onGranted: () => void | Promise<void>, onClosedWithoutGrant?: () => void) => {
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
            onClosedWithoutGrant?.();
            return;
          }

          slotRef.current = slot;
          slot.addService(googletag.pubads());

          // pubads()는 페이지 전역 서비스라 리스너가 클릭마다 쌓이면 두 번째 시청부터
          // 지급 콜백이 여러 번 호출된다. 이 슬롯의 광고가 닫히면 반드시 해제한다.
          const pubads = googletag.pubads();

          // 노필(광고 없음)이면 어떤 이벤트도 오지 않아 버튼이 영원히 "준비 중"에 머문다.
          const noFill: { timer?: ReturnType<typeof setTimeout> } = {};

          const onReady = (event: GoogletagEvent) => {
            clearTimeout(noFill.timer);
            setStatus("ready");
            event.makeRewardedVisible();
            setStatus("playing");
          };

          const onGranted_ = async () => {
            grantedRef.current = true;
            setStatus("granted");
            await onGranted();
          };

          const cleanup = () => {
            clearTimeout(noFill.timer);
            pubads.removeEventListener("rewardedSlotReady", onReady);
            pubads.removeEventListener("rewardedSlotGranted", onGranted_);
            pubads.removeEventListener("rewardedSlotClosed", onClosed);
          };

          const onClosed = () => {
            if (!grantedRef.current) {
              setStatus("closed_without_reward");
              onClosedWithoutGrant?.();
            }
            cleanup();
            if (slotRef.current) {
              googletag.destroySlots([slotRef.current]);
            }
            slotRef.current = null;
          };

          pubads.addEventListener("rewardedSlotReady", onReady);
          pubads.addEventListener("rewardedSlotGranted", onGranted_);
          pubads.addEventListener("rewardedSlotClosed", onClosed);

          noFill.timer = setTimeout(() => {
            cleanup();
            if (slotRef.current) googletag.destroySlots([slotRef.current]);
            slotRef.current = null;
            setStatus("error");
            onClosedWithoutGrant?.();
          }, NO_FILL_TIMEOUT_MS);

          googletag.enableServices();
          googletag.display(slot);
        });
      } catch (err) {
        console.error("리워드 광고 로드 실패:", err);
        setStatus("error");
        onClosedWithoutGrant?.();
      }
    },
    []
  );

  return { status, showRewardedAd };
}
