import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";

interface GuardScreenProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

/** 필요한 데이터(기본 정보/설문/분석 결과 등)가 없을 때 다음 단계로 안내하는 공통 화면 */
export function GuardScreen({ title, description, actionLabel, onAction }: GuardScreenProps) {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <Card>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      </Card>
    </div>
  );
}
