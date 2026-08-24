import { CardTitle, CardDescription } from "@/components/common/Card";
import { RelatedTypeGroup } from "@/lib/compatibility";
import { QUADRANT_RELATION_DESC } from "@/data/quadrantRelations";

interface RelatedTypesPanelProps {
  related: RelatedTypeGroup[];
}

export function RelatedTypesPanel({ related }: RelatedTypesPanelProps) {
  const complementary = related.filter((r) => r.relation === "보완형");
  const diagonal = related.filter((r) => r.relation === "대각형");

  return (
    <div>
      <CardTitle>유형별 관계 적합도</CardTitle>
      <CardDescription className="mt-1">
        지인의 정확한 사주 없이도, 행동 스타일만으로 참고할 수 있는 경향입니다.
      </CardDescription>

      {complementary.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-growth">{QUADRANT_RELATION_DESC.보완형.title}</p>
          <p className="mt-1 text-xs text-muted">{QUADRANT_RELATION_DESC.보완형.desc}</p>
          <p className="mt-2 text-sm text-foreground">
            {complementary.flatMap((g) => g.typeNames).join(", ")}
          </p>
        </div>
      )}

      {diagonal.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-fate">{QUADRANT_RELATION_DESC.대각형.title}</p>
          <p className="mt-1 text-xs text-muted">{QUADRANT_RELATION_DESC.대각형.desc}</p>
          <p className="mt-2 text-sm text-foreground">
            {diagonal.flatMap((g) => g.typeNames).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
