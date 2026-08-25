"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";
import { GuardScreen } from "@/components/common/GuardScreen";
import { useGrowthSession } from "@/lib/useGrowthSession";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { completeQuest, isQuestCompleted } from "@/lib/quest";
import { getQuestById } from "@/data/quests";
import { getLevelProgress } from "@/lib/growth";
import { objectParticle } from "@/lib/korean";
import type { CompleteQuestResult } from "@/lib/quest";

export default function QuestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const authGate = useRequireLogin();
  const session = useGrowthSession();
  const [result, setResult] = useState<CompleteQuestResult | null>(null);

  if (authGate.configured && (authGate.loading || authGate.redirecting)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        로그인 확인 중입니다…
      </div>
    );
  }

  if (session.status === "loading") {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        불러오는 중입니다…
      </div>
    );
  }

  if (session.status === "missing-analysis" || !session.profile) {
    return (
      <GuardScreen
        title="아직 캐릭터가 없어요"
        description="기본 정보 입력과 설문을 완료하면 퀘스트를 진행할 수 있어요."
        actionLabel="시작하러 가기"
        onAction={() => router.push("/start")}
      />
    );
  }

  const quest = getQuestById(params.id);
  if (!quest) {
    return (
      <GuardScreen
        title="퀘스트를 찾을 수 없어요"
        description="존재하지 않는 퀘스트입니다."
        actionLabel="퀘스트 목록으로"
        onAction={() => router.push("/quests")}
      />
    );
  }

  const alreadyCompleted = isQuestCompleted(session.profile, quest.id);

  function handleComplete() {
    if (!session.profile) return;
    const completionResult = completeQuest(session.profile, quest!.id);
    if (!completionResult) return;
    session.setProfile(completionResult.profile);
    setResult(completionResult);
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      <p className="text-xs text-fate">{quest.category} 퀘스트</p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
        {quest.title}
      </h1>

      <Card className="mt-6">
        <CardDescription>{quest.description}</CardDescription>
        <div className="mt-4 flex gap-3 text-sm">
          <span className="rounded-full border border-growth/40 bg-growth-soft px-3 py-1 text-growth">
            +{quest.xpReward} XP
          </span>
          <span className="rounded-full border border-fate/40 bg-fate-soft px-3 py-1 text-fate">
            +{quest.statReward} {quest.focusStat}
          </span>
        </div>
      </Card>

      {!result && (
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={handleComplete}
          disabled={alreadyCompleted}
        >
          {alreadyCompleted ? "이미 완료한 퀘스트예요" : "퀘스트 완료하기"}
        </Button>
      )}

      {result && (
        <Card className="mt-6 border-growth/40 bg-growth-soft text-center">
          <CardTitle>퀘스트 완료!</CardTitle>
          <CardDescription className="mt-2">
            {quest.title}{objectParticle(quest.title)} 완료해 {quest.xpReward} XP와{" "}
            {quest.focusStat} {quest.statReward}만큼 얻었어요.
          </CardDescription>

          {result.leveledUp && (
            <>
              <p className="mt-3 font-numeral text-lg text-growth">
                레벨업! Lv.{getLevelProgress(result.profile.xp).level}
              </p>
              <Link
                href={`/share/level-${getLevelProgress(result.profile.xp).level}`}
                className="mt-2 inline-block text-xs text-fate underline underline-offset-2"
              >
                레벨업 카드 공유하기
              </Link>
            </>
          )}

          {result.newBadges.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {result.newBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-xl border border-fate/40 bg-fate-soft px-3 py-2 text-sm text-foreground"
                >
                  <p>
                    새 뱃지 획득: <span className="text-fate">{badge.name}</span>
                  </p>
                  <Link
                    href={`/share/badge-${badge.id}`}
                    className="mt-1 inline-block text-xs text-fate underline underline-offset-2"
                  >
                    뱃지 카드 공유하기
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              대시보드로
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => router.push("/quests")}>
              다른 퀘스트 보기
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
