"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";
import { GuardScreen } from "@/components/common/GuardScreen";
import { GrowthTimeline } from "@/components/growth/GrowthTimeline";
import { useGrowthSession } from "@/lib/useGrowthSession";
import { buildGrowthHistory } from "@/lib/growthHistory";
import { getLevelProgress } from "@/lib/growth";

export default function GrowthHistoryPage() {
  const router = useRouter();
  const session = useGrowthSession();

  if (session.status === "loading") {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        성장 히스토리를 불러오는 중입니다…
      </div>
    );
  }

  if (session.status === "missing-analysis" || !session.profile) {
    return (
      <GuardScreen
        title="아직 기록할 게 없어요"
        description="기본 정보 입력과 설문을 완료하면 성장 히스토리가 쌓이기 시작해요."
        actionLabel="시작하러 가기"
        onAction={() => router.push("/start")}
      />
    );
  }

  const { profile } = session;
  const events = buildGrowthHistory(profile);
  const levelProgress = getLevelProgress(profile.xp);

  return (
    <div className="relative">
      <section className="px-5 pb-6 pt-14">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-xs text-fate">성장 히스토리</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            지금까지의 성장 기록
          </h1>
          <p className="mt-2 text-sm text-muted">
            지금까지 퀘스트 {profile.questLog.length}개를 완료하고 뱃지 {profile.badges.length}개를
            모았어요
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-lg px-5 pb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-3 text-center">
            <p className="text-xs text-muted">레벨</p>
            <p className="mt-1 font-numeral text-xl font-semibold text-foreground">
              Lv.{levelProgress.level}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-3 text-center">
            <p className="text-xs text-muted">완료 퀘스트</p>
            <p className="mt-1 font-numeral text-xl font-semibold text-foreground">
              {profile.questLog.length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-3 text-center">
            <p className="text-xs text-muted">획득 뱃지</p>
            <p className="mt-1 font-numeral text-xl font-semibold text-foreground">
              {profile.badges.length}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-lg px-5 pb-24">
        <Card>
          <CardTitle>타임라인</CardTitle>
          <CardDescription className="mt-1">
            퀘스트 완료, 레벨업, 뱃지 획득 순간을 최신순으로 모았습니다.
          </CardDescription>
          <div className="mt-5">
            <GrowthTimeline events={events} />
          </div>
        </Card>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href="/share/character" className="w-full">
            <Button className="w-full">캐릭터 카드 공유하기</Button>
          </Link>
          <Link href="/dashboard" className="w-full">
            <Button variant="secondary" className="w-full">
              대시보드로
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
