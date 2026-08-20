import { AxisScores } from "@/types/survey";
import { CardTitle, CardDescription } from "@/components/common/Card";

const AXIS_CONFIG: {
  key: keyof AxisScores;
  title: string;
  leftLetter: string;
  leftLabel: string;
  rightLetter: string;
  rightLabel: string;
}[] = [
  { key: "EI", title: "에너지 방향", leftLetter: "E", leftLabel: "외부 활동", rightLetter: "I", rightLabel: "내면 집중" },
  { key: "SN", title: "정보 인식", leftLetter: "S", leftLabel: "현실·경험", rightLetter: "N", rightLabel: "가능성·직관" },
  { key: "TF", title: "판단 기준", leftLetter: "T", leftLabel: "논리·기준", rightLetter: "F", rightLabel: "관계·공감" },
  { key: "JP", title: "생활 방식", leftLetter: "J", leftLabel: "계획·구조", rightLetter: "P", rightLabel: "유연·개방" },
];

interface AxisScoreBarsProps {
  scores: AxisScores;
}

export function AxisScoreBars({ scores }: AxisScoreBarsProps) {
  return (
    <div>
      <CardTitle>성향 점수</CardTitle>
      <CardDescription className="mt-1">
        16유형 성향 설문(Life Pattern Profiler) 응답을 4개 축으로 정리했습니다.
      </CardDescription>
      <div className="mt-5 flex flex-col gap-5">
        {AXIS_CONFIG.map((axis) => {
          const value = scores[axis.key]; // 0~100, 높을수록 leftLetter 방향
          const dominant = value >= 50 ? axis.leftLetter : axis.rightLetter;
          const dominantPercent = value >= 50 ? value : 100 - value;
          return (
            <div key={axis.key}>
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                <span>{axis.title}</span>
                <span className="font-numeral text-foreground">
                  {dominant} {dominantPercent}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-fate transition-all duration-500"
                  style={{ width: `${value}%` }}
                />
                <div className="absolute inset-y-0 left-1/2 w-px bg-bg/60" />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted">
                <span>{axis.leftLabel} ({axis.leftLetter})</span>
                <span>{axis.rightLabel} ({axis.rightLetter})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
