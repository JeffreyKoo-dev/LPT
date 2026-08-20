"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/common/Card";
import { BehaviorQuadrant } from "@/types/lpt";
import { getDailyCard } from "@/lib/dailyCard";

interface DailyCardWidgetProps {
  quadrant: BehaviorQuadrant;
}

export function DailyCardWidget({ quadrant }: DailyCardWidgetProps) {
  // 날짜 기반 로직은 hydration mismatch 방지를 위해 클라이언트에서만 계산한다.
  const [card, setCard] = useState<{ dateLabel: string; message: string } | null>(null);

  useEffect(() => {
    setCard(getDailyCard(quadrant));
  }, [quadrant]);

  return (
    <Card className="border-growth/30 bg-growth-soft">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-growth/40 bg-growth-soft px-3 py-1 text-xs text-growth">
          오늘의 LPT 카드
        </span>
        {card && <span className="text-xs text-muted">{card.dateLabel}</span>}
      </div>
      <p className="mt-4 min-h-[3rem] text-base leading-relaxed text-foreground">
        {card ? card.message : "오늘의 카드를 불러오는 중…"}
      </p>
    </Card>
  );
}
