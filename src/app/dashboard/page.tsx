"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";
import { GuardScreen } from "@/components/common/GuardScreen";
import { StatGrid } from "@/components/growth/StatGrid";
import { LevelPanel } from "@/components/growth/LevelPanel";
import { useGrowthSession } from "@/lib/useGrowthSession";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { getLevelProgress } from "@/lib/growth";
import { BADGES } from "@/data/badges";

export default function DashboardPage() {
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
        성장 프로필을 불러오는 중입니다…
      </div>
    );
  }

  if (session.status === "missing-analysis" || !session.profile || !session.typeMeta || !session.fantasyClass) {
    return (
      <GuardScreen
        title="아직 캐릭터가 없어요"
        description="기본 정보 입력과 설문을 완료하면 성장 대시보드를 사용할 수 있어요."
        actionLabel="시작하러 가기"
        onAction={() => router.push("/start")}
      />
    );
  }

  const { profile, typeMeta, fantasyClass, nickname } = session;
  const levelProgress = getLevelProgress(profile.xp);
  const earnedBadgeCount = profile.badges.length;

  return (
    <div className="relative">
      <section className="px-5 pb-6 pt-14">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-xs text-fate">{nickname}님의 성장 대시보드</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            {typeMeta.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{fantasyClass.className}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-lg gap-5 px-5 pb-24">
        <Card>
          <LevelPanel levelProgress={levelProgress} />
        </Card>

        <Card>
          <CardTitle>스탯</CardTitle>
          <CardDescription className="mt-1">
            퀘스트를 완료할수록 관련 스탯이 성장합니다.
          </CardDescription>
          <div className="mt-4">
            <StatGrid stats={profile.stats} highlightStat={fantasyClass.primaryStat} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>뱃지</CardTitle>
              <CardDescription className="mt-1">
                {earnedBadgeCount} / {BADGES.length}개 획득
              </CardDescription>
            </div>
            <Link href="/badges">
              <Button variant="secondary">모두 보기</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>성장 퀘스트</CardTitle>
              <CardDescription className="mt-1">
                완료한 퀘스트 {profile.questLog.length}개
              </CardDescription>
            </div>
            <Link href="/quests">
              <Button>퀘스트 보기</Button>
            </Link>
          </div>
        </Card>

        <Link href="/result">
          <Button variant="ghost" className="w-full">
            분석 리포트 다시 보기
          </Button>
        </Link>

        <Link href="/share/character">
          <Button variant="secondary" className="w-full">
            캐릭터 카드 공유하기
          </Button>
        </Link>
      </section>
    </div>
  );
}
