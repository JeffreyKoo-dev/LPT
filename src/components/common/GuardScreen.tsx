import { LucideIcon, Compass } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";

interface GuardScreenProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  /** 상황을 한눈에 알려주는 아이콘. 생략하면 기본 나침반 아이콘을 씁니다. */
  icon?: LucideIcon;
}

/** 필요한 데이터(기본 정보/설문/분석 결과 등)가 없을 때 다음 단계로 안내하는 공통 화면 */
export function GuardScreen({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Compass,
}: GuardScreenProps) {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <Card>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-fate-soft">
          <Icon className="h-6 w-6 text-fate" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      </Card>
    </div>
  );
}
