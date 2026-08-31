"use client";

import { useRouter } from "next/navigation";
import { GuardScreen } from "@/components/common/GuardScreen";
import { BadgeCard } from "@/components/badge/BadgeCard";
import { PageHeading } from "@/components/common/PageHeading";
import { useGrowthSession } from "@/lib/useGrowthSession";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { BADGES } from "@/data/badges";
import { getBadgeEarnedAt } from "@/lib/badge";

export default function BadgesPage() {
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
        <div className="mx-auto max-w-lg">
          <PageHeading label="뱃지 컬렉션" title={`${profile.badges.length} / ${BADGES.length}개 획득`} />
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
