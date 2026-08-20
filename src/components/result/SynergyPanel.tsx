import { Sparkles, ArrowUpRight } from "lucide-react";
import { CardTitle, CardDescription } from "@/components/common/Card";
import { LptTypeMeta } from "@/types/lpt";

interface SynergyPanelProps {
  typeMeta: LptTypeMeta;
}

export function SynergyPanel({ typeMeta }: SynergyPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <CardTitle className="text-base">성장 시너지</CardTitle>
        <CardDescription className="mt-1">힘을 발휘할 수 있는 포인트</CardDescription>
        <ul className="mt-3 flex flex-col gap-2">
          {typeMeta.strengths.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg border border-growth/30 bg-growth-soft px-3 py-2 text-sm text-foreground"
            >
              <Sparkles size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-growth" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <CardTitle className="text-base">성장 포인트</CardTitle>
        <CardDescription className="mt-1">채워가면 도움이 될 수 있는 부분</CardDescription>
        <ul className="mt-3 flex flex-col gap-2">
          {typeMeta.growthPoints.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg border border-fate/30 bg-fate-soft px-3 py-2 text-sm text-foreground"
            >
              <ArrowUpRight size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fate" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
