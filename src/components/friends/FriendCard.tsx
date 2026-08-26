import Link from "next/link";
import { Card, CardTitle } from "@/components/common/Card";
import { Friend } from "@/lib/friends";
import { getLptTypeMeta } from "@/data/lptTypes";
import { computeTypeCompatibility } from "@/lib/compatibility";
import { LptTypeId } from "@/types/lpt";

interface FriendCardProps {
  friend: Friend;
  myTypeId: LptTypeId | null;
}

export function FriendCard({ friend, myTypeId }: FriendCardProps) {
  const friendTypeMeta = friend.lptTypeId ? getLptTypeMeta(friend.lptTypeId) : undefined;
  const sameType = !!myTypeId && myTypeId === friend.lptTypeId;
  const compat =
    myTypeId && friend.lptTypeId ? computeTypeCompatibility(myTypeId, friend.lptTypeId) : null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{friend.nickname}</CardTitle>
          <p className="mt-1 text-sm text-muted">
            {friendTypeMeta ? friendTypeMeta.name : "아직 유형 미확인"}
          </p>
        </div>
        {sameType && (
          <span className="shrink-0 rounded-full border border-growth/40 bg-growth-soft px-2.5 py-1 text-xs text-growth">
            같은 성향
          </span>
        )}
      </div>

      {compat && (
        <div className="mt-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
          <p className="text-sm font-medium text-foreground">{compat.headline}</p>
          <p className="mt-1 text-xs text-muted">{compat.description}</p>
        </div>
      )}

      <Link
        href="/compatibility"
        className="mt-3 inline-block text-xs text-fate underline underline-offset-2"
      >
        정밀 궁합 보기 (생년월일시 기반)
      </Link>
    </Card>
  );
}
