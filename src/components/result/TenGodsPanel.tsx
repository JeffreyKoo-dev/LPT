import { CardTitle, CardDescription } from "@/components/common/Card";
import { SajuChart, TenGod } from "@/types/saju";
import { objectParticle } from "@/lib/korean";

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

function TenGodChip({ label, god }: { label: string; god: TenGod }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-lg border border-border bg-surface px-2.5 py-1">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="font-numeral text-sm text-foreground">{god}</span>
      <span className="text-[11px] text-muted">{TEN_GOD_HINT[god]}</span>
    </span>
  );
}

interface TenGodsPanelProps {
  sajuChart: SajuChart;
}

export function TenGodsPanel({ sajuChart }: TenGodsPanelProps) {
  const { year, month, day, hour } = sajuChart.tenGods;

  const rows: { key: string; label: string; stem: TenGod | null; branch: TenGod | null }[] = [
    { key: "year", label: "년주 (뿌리)", stem: year.stem, branch: year.branch },
    { key: "month", label: "월주 (사회적 자아)", stem: month.stem, branch: month.branch },
    { key: "day", label: "일주 (나 자신)", stem: null, branch: day.branch },
    {
      key: "hour",
      label: "시주 (미래·확장)",
      stem: hour?.stem ?? null,
      branch: hour?.branch ?? null,
    },
  ];

  return (
    <div>
      <CardTitle>십성으로 보는 기질</CardTitle>
      <CardDescription className="mt-1">
        일간(日干) {sajuChart.dayMaster.hangul}{objectParticle(sajuChart.dayMaster.hangul)} 기준으로
        각 기둥의 천간(天干)·지지(地支)와의 관계를 함께 살펴본 결과입니다.
      </CardDescription>
      <div className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3"
          >
            <span className="text-sm text-muted">{row.label}</span>
            {row.key === "hour" && !hour ? (
              <span className="text-xs text-muted">출생시간 미입력</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {row.stem && <TenGodChip label="천간" god={row.stem} />}
                {row.branch && <TenGodChip label="지지" god={row.branch} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
