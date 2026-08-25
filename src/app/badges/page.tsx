"use client";

import { useRouter } from "next/navigation";
import { GuardScreen } from "@/components/common/GuardScreen";
import { BadgeCard } from "@/components/badge/BadgeCard";
import { useGrowthSession } from "@/lib/useGrowthSession";
import { BADGES } from "@/data/badges";
import { getBadgeEarnedAt } from "@/lib/badge";

export default function BadgesPage() {
  const router = useRouter();
  const session = useGrowthSession();

  if (session.status === "loading") {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        뱃지를 불러오는 중입니다…
      </div>
    );
  }

  if (session.status === "missing-analysis" || !session.profile) {
    return (
      <GuardScreen
        title="아직 캐릭터가 없어요"
        description="기본 정보 입력과 설문을 완료하면 뱃지를 모을 수 있어요."
        actionLabel="시작하러 가기"
        onAction={() => router.push("/start")}
      />
    );
  }

  const { profile } = session;

  return (
    <div className="relative">
      <section className="px-5 pb-6 pt-14">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-xs text-fate">뱃지 컬렉션</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            {profile.badges.length} / {BADGES.length}개 획득
          </h1>
        </div>
      </section>

      <section className="mx-auto grid max-w-lg grid-cols-2 gap-3 px-5 pb-24 sm:grid-cols-3">
        {BADGES.map((badge) => {
          const earned = profile.badges.includes(badge.id);
          return (
            <BadgeCard
              key={badge.id}
              name={badge.name}
              description={badge.description}
              earned={earned}
              earnedAt={earned ? getBadgeEarnedAt(badge.id) : null}
              shareHref={earned ? `/share/badge-${badge.id}` : undefined}
            />
          );
        })}
      </section>
    </div>
  );
}
