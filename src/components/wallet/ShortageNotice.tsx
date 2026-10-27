"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { saveChargeReturn } from "@/lib/chargeReturn";
import type { Shortage } from "@/lib/shortage";

/** 보석이 모자랄 때 부족분과 추천 충전액을 안내하고, 충전 후 이 화면으로 돌아오게 한다. */
export function ShortageNotice({ shortage, onClose }: { shortage: Shortage; onClose: () => void }) {
  const router = useRouter();

  function handleGoCharge() {
    saveChargeReturn(window.location.pathname + window.location.search);
    router.push(shortage.option ? `/charge?amount=${shortage.option.krwAmount}` : "/charge");
  }

  return (
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
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}
