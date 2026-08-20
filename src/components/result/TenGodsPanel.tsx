import { CardTitle, CardDescription } from "@/components/common/Card";
import { SajuChart, TenGod } from "@/types/saju";

const TEN_GOD_HINT: Record<TenGod, string> = {
  비견: "동료·자립",
  겁재: "경쟁·추진",
  식신: "표현·여유",
  상관: "재능·변화",
  편재: "기회 포착",
  정재: "안정적 관리",
  편관: "돌파·도전",
  정관: "책임·원칙",
  편인: "직관·학습",
  정인: "지지·신뢰",
};

interface TenGodsPanelProps {
  sajuChart: SajuChart;
}

export function TenGodsPanel({ sajuChart }: TenGodsPanelProps) {
  const rows: { label: string; god: TenGod | null }[] = [
    { label: "년주 (뿌리)", god: sajuChart.tenGods.year },
    { label: "월주 (사회적 자아)", god: sajuChart.tenGods.month },
    { label: "시주 (미래·확장)", god: sajuChart.tenGods.hour },
  ];

  return (
    <div>
      <CardTitle>십성으로 보는 기질</CardTitle>
      <CardDescription className="mt-1">
        일간(日干) {sajuChart.dayMaster.hangul}을 기준으로 다른 기둥과의 관계를
        살펴본 결과입니다.
      </CardDescription>
      <div className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3"
          >
            <span className="text-sm text-muted">{row.label}</span>
            {row.god ? (
              <span className="text-right">
                <span className="font-numeral text-sm text-foreground">{row.god}</span>
                <span className="ml-2 text-xs text-muted">{TEN_GOD_HINT[row.god]}</span>
              </span>
            ) : (
              <span className="text-xs text-muted">출생시간 미입력</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
