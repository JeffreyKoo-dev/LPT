"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { AnalysisReport } from "@/types/report";
import { GrowthProfile } from "@/types/growth";
import { FantasyClassMeta } from "@/types/lpt";
import {
  getDailyLunch,
  getDailyShoppingItem,
  getDailyQuest,
  getDailyFriendSuggestion,
  DailyFriendSuggestion,
} from "@/lib/dailyRecommendation";
import { getFriendsList } from "@/lib/friends";
import { Quest } from "@/types/quest";
import { ShoppingItem } from "@/data/shoppingItems";

interface TodayRecommendationPanelProps {
  report: AnalysisReport;
  profile: GrowthProfile;
  fantasyClass: FantasyClassMeta;
}

export function TodayRecommendationPanel({
  report,
  profile,
  fantasyClass,
}: TodayRecommendationPanelProps) {
  const [friendSuggestion, setFriendSuggestion] = useState<DailyFriendSuggestion | null>(null);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  useEffect(() => {
    getFriendsList()
      .then((friends) => {
        setFriendSuggestion(getDailyFriendSuggestion(friends, report.lptType.typeId));
        setFriendsLoaded(true);
      })
      .catch(() => setFriendsLoaded(true));
  }, [report.lptType.typeId]);

  const lunch = getDailyLunch(report.sajuChart.dominantElement);
  const shoppingItem: ShoppingItem = getDailyShoppingItem(report.sajuChart.dominantElement);
  const dailyQuest: Quest | null = getDailyQuest(fantasyClass, profile);

  return (
    <Card>
      <CardTitle>오늘의 추천</CardTitle>
      <CardDescription className="mt-1">
        오늘 날짜와 유형을 참고해 순환 노출되는 참고 정보입니다.
      </CardDescription>

      <div className="mt-4 flex flex-col gap-3">
        {/* 오늘의 퀘스트 */}
        <div className="rounded-lg border border-border bg-surface-2 px-3 py-3">
          <p className="text-xs text-fate">오늘의 추천 퀘스트</p>
          {dailyQuest ? (
            <Link href={`/quests/${dailyQuest.id}`} className="mt-1 block">
              <p className="text-sm font-medium text-foreground">{dailyQuest.title}</p>
              <p className="mt-0.5 text-xs text-muted">{dailyQuest.description}</p>
            </Link>
          ) : (
            <p className="mt-1 text-sm text-muted">오늘 추천할 새 퀘스트가 없어요. 모두 완료하셨네요!</p>
          )}
        </div>

        {/* 오늘의 점심 */}
        <div className="rounded-lg border border-border bg-surface-2 px-3 py-3">
          <p className="text-xs text-growth">오늘의 점심</p>
          <p className="mt-1 text-sm text-foreground">{lunch}</p>
        </div>

        {/* 오늘 만나면 좋을 사람 */}
        <div className="rounded-lg border border-border bg-surface-2 px-3 py-3">
          <p className="text-xs text-fate">오늘 만나면 좋을 사람</p>
          {!friendsLoaded && <p className="mt-1 text-sm text-muted">불러오는 중…</p>}
          {friendsLoaded && friendSuggestion && (
            <div className="mt-1">
              <p className="text-sm font-medium text-foreground">{friendSuggestion.friend.nickname}</p>
              <p className="mt-0.5 text-xs text-muted">{friendSuggestion.headline}</p>
            </div>
          )}
          {friendsLoaded && !friendSuggestion && (
            <Link href="/friends" className="mt-1 block text-sm text-muted underline underline-offset-2">
              친구를 초대하면 추천을 받아볼 수 있어요
            </Link>
          )}
        </div>

        {/* 오늘의 추천 아이템 */}
        <div className="rounded-lg border border-border bg-surface-2 px-3 py-3">
          <p className="text-xs text-growth">오늘의 추천 아이템</p>
          <p className="mt-1 text-sm font-medium text-foreground">{shoppingItem.name}</p>
          <p className="mt-0.5 text-xs text-muted">{shoppingItem.blurb}</p>
          {shoppingItem.affiliateUrl ? (
            <a
              href={shoppingItem.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-fate underline underline-offset-2"
            >
              둘러보기
            </a>
          ) : (
            <p className="mt-1 text-xs text-muted">둘러보기 링크 준비 중</p>
          )}
        </div>
      </div>
    </Card>
  );
}
