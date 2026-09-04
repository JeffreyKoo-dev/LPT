import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { ProgressBar } from "@/components/common/ProgressBar";
import { CompatibilityResult } from "@/lib/compatibility";
import { conjunctionParticle } from "@/lib/korean";

interface CompatibilityResultCardProps {
  nicknameA: string;
  nicknameB: string;
  result: CompatibilityResult;
}

export function CompatibilityResultCard({
  nicknameA,
  nicknameB,
  result,
}: CompatibilityResultCardProps) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="border-t-2 border-t-fate text-center">
        <p className="text-xs text-muted">
          {nicknameA}{conjunctionParticle(nicknameA)} {nicknameB}
        </p>
        <CardTitle className="mt-2 text-2xl">{result.headline}</CardTitle>
        <CardDescription className="mt-2">{result.description}</CardDescription>
        <div className="mt-5">
          <ProgressBar value={result.score} label="관계 적합도 (참고용)" />
        </div>
      </Card>

      {result.synergyPoints.length > 0 && (
        <Card>
          <CardTitle className="text-base">시너지 포인트</CardTitle>
          <ul className="mt-3 flex flex-col gap-2">
            {result.synergyPoints.map((point) => (
              <li
                key={point}
                className="rounded-lg border border-growth/30 bg-growth-soft px-3 py-2 text-sm text-foreground"
              >
                {point}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result.cautionPoints.length > 0 && (
        <Card>
          <CardTitle className="text-base">조율이 도움이 될 수 있는 부분</CardTitle>
          <ul className="mt-3 flex flex-col gap-2">
            {result.cautionPoints.map((point) => (
              <li
                key={point}
                className="rounded-lg border border-fate/30 bg-fate-soft px-3 py-2 text-sm text-foreground"
              >
                {point}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-center text-xs text-muted">
        이 결과는 두 분의 사주 오행을 참고한 경향일 뿐, 관계를 단정하지 않습니다.
        입력하신 상대방 정보는 저장되지 않습니다.
      </p>
    </div>
  );
}
