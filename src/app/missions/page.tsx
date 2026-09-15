"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/common/PageHeading";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useRequireLogin } from "@/lib/useRequireLogin";
import {
  getMilestoneDefinitions,
  getMyProgress,
  getClaimedMilestoneIds,
  claimMilestoneReward,
  MilestoneDefinition,
} from "@/lib/milestones";

const METRIC_LABEL: Record<string, string> = {
  friend_invites: "친구초대",
};

export default function MissionsPage() {
  const router = useRouter();
  const authGate = useRequireLogin();
  const [definitions, setDefinitions] = useState<MilestoneDefinition[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [claimed, setClaimed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authGate.configured || authGate.loading || authGate.redirecting) return;

    Promise.all([getMilestoneDefinitions(), getMyProgress(), getClaimedMilestoneIds()]).then(
      ([defs, prog, claimedIds]) => {
        setDefinitions(defs);
        setProgress(prog);
        setClaimed(claimedIds);
        setLoading(false);
      }
    );
  }, [authGate.configured, authGate.loading, authGate.redirecting]);

  if (authGate.configured && (authGate.loading || authGate.redirecting)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        로그인 확인 중입니다…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        불러오는 중입니다…
      </div>
    );
  }

  // metric_type별로 그룹핑해서, 같은 미션의 여러 단계를 하나의 카드로 묶어 보여준다.
  const grouped = definitions.reduce<Record<string, MilestoneDefinition[]>>((acc, d) => {
    (acc[d.metric_type] ??= []).push(d);
    return acc;
  }, {});

  async function handleClaim(id: number) {
    try {
      await claimMilestoneReward(id);
      setClaimed((prev) => new Set(prev).add(id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "수령에 실패했어요.");
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <PageHeading label="미션" title="목표를 달성하고 캐시를 받아보세요" />

      {Object.entries(grouped).map(([metricType, milestones]) => {
        const currentValue = progress[metricType] ?? 0;
        return (
          <Card key={metricType} className="mt-6">
            <CardTitle>{METRIC_LABEL[metricType] ?? metricType}</CardTitle>
            <CardDescription className="mt-1">현재 {currentValue}회 달성</CardDescription>

            <div className="mt-4 flex flex-col gap-2">
              {milestones.map((m) => {
                const isClaimed = claimed.has(m.id);
                const isAchieved = currentValue >= m.threshold;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                      isClaimed
                        ? "border-border bg-surface-2 opacity-60"
                        : isAchieved
                          ? "border-fate bg-fate-soft"
                          : "border-border bg-surface-2"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-muted">
                        {m.threshold}회 달성 · {m.reward_cash.toLocaleString()}캐시
                      </p>
                    </div>
                    {isClaimed ? (
                      <span className="text-xs text-muted">받음</span>
                    ) : isAchieved ? (
                      <Button onClick={() => handleClaim(m.id)}>받기</Button>
                    ) : (
                      <span className="text-xs text-muted">
                        {currentValue}/{m.threshold}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {metricType === "friend_invites" && (
              <Button variant="secondary" className="mt-4 w-full" onClick={() => router.push("/friends")}>
                친구 초대하러 가기
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
