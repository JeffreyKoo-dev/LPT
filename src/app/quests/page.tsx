"use client";

import { useRouter } from "next/navigation";
import { GuardScreen } from "@/components/common/GuardScreen";
import { QuestCard } from "@/components/quest/QuestCard";
import { useGrowthSession } from "@/lib/useGrowthSession";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { getRecommendedQuests, isQuestCompleted } from "@/lib/quest";

export default function QuestsPage() {
  const router = useRouter();
  const authGate = useRequireLogin();
  const session = useGrowthSession();

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
        퀘스트를 불러오는 중입니다…
      </div>
    );
  }

  if (session.status === "missing-analysis" || !session.profile || !session.fantasyClass) {
    return (
      <GuardScreen
        title="아직 캐릭터가 없어요"
        description="기본 정보 입력과 설문을 완료하면 맞춤 퀘스트를 추천받을 수 있어요."
        actionLabel="시작하러 가기"
        onAction={() => router.push("/start")}
      />
    );
  }

  const { profile, fantasyClass } = session;
  const quests = getRecommendedQuests(fantasyClass, profile);

  return (
    <div className="relative">
      <section className="px-5 pb-6 pt-14">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-xs text-fate">성장 퀘스트</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            {fantasyClass.className}에게 맞는 퀘스트
          </h1>
          <p className="mt-2 text-sm text-muted">
            {fantasyClass.primaryStat} 관련 퀘스트가 먼저 추천됩니다.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-lg gap-3 px-5 pb-24">
        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            completed={isQuestCompleted(profile, quest.id)}
            recommended={quest.focusStat === fantasyClass.primaryStat}
          />
        ))}
      </section>
    </div>
  );
}
