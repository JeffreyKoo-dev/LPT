import { CardTitle, CardDescription } from "@/components/common/Card";
import { ProgressBar } from "@/components/common/ProgressBar";
import { INDICATOR_LABELS, LifestyleIndicator } from "@/types/indicator";

interface LifestyleIndicatorPanelProps {
  indicator: LifestyleIndicator;
}

export function LifestyleIndicatorPanel({ indicator }: LifestyleIndicatorPanelProps) {
  const entries = Object.entries(indicator) as [keyof LifestyleIndicator, number][];

  return (
    <div>
      <CardTitle>라이프스타일 인디케이터</CardTitle>
      <CardDescription className="mt-1">
        생활, 일, 관계, 성장 방식을 참고 지표로 시각화했습니다.
      </CardDescription>
      <div className="mt-5 flex flex-col gap-4">
        {entries.map(([key, value]) => (
          <ProgressBar key={key} label={INDICATOR_LABELS[key]} value={value} />
        ))}
      </div>
    </div>
  );
}
