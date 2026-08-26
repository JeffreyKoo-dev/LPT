"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";
import { GuardScreen } from "@/components/common/GuardScreen";
import { FriendCard } from "@/components/friends/FriendCard";
import { useGrowthSession } from "@/lib/useGrowthSession";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { createFriendInvite, getFriendsList, Friend } from "@/lib/friends";
import { useRouter } from "next/navigation";

export default function FriendsPage() {
  const router = useRouter();
  const authGate = useRequireLogin();
  const session = useGrowthSession();

  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "creating" | "error">("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    if (!authGate.user) return;
    getFriendsList()
      .then(setFriends)
      .catch(() => setFriends([]));
  }, [authGate.user]);

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

  if (session.status === "missing-analysis" || !session.report) {
    return (
      <GuardScreen
        title="먼저 내 결과가 필요해요"
        description="기본 정보 입력과 설문을 완료하면 친구를 초대할 수 있어요."
        actionLabel="시작하러 가기"
        onAction={() => router.push("/start")}
      />
    );
  }

  async function handleCreateInvite() {
    setInviteStatus("creating");
    try {
      const invite = await createFriendInvite();
      setInviteUrl(invite.shareUrl);
      setInviteStatus("idle");
    } catch (error) {
      console.error("[friends] 초대 링크 생성 실패", error);
      setInviteStatus("error");
    }
  }

  async function handleCopyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopyStatus("copied");
    window.setTimeout(() => setCopyStatus("idle"), 2000);
  }

  async function handleShareInvite() {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "LPT 친구 초대", text: "LPT에서 친구가 되어주세요!", url: inviteUrl });
      } catch {
        // 사용자가 취소한 경우 등은 무시
      }
    } else {
      handleCopyInvite();
    }
  }

  const myTypeId = session.report.lptType.typeId;

  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      <div className="mb-6 text-center">
        <p className="text-xs text-fate">친구</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
          지인과 성향을 비교해보세요
        </h1>
        <p className="mt-2 text-xs text-muted">
          검색으로 찾는 기능은 없어요. 초대 링크를 공유하고, 상대방이 로그인
          상태로 열어 수락하면 친구가 됩니다.
        </p>
      </div>

      <Card>
        <CardTitle>친구 초대하기</CardTitle>
        {!inviteUrl ? (
          <Button className="mt-3 w-full" onClick={handleCreateInvite} disabled={inviteStatus === "creating"}>
            {inviteStatus === "creating" ? "만드는 중…" : "초대 링크 만들기"}
          </Button>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted break-all">
              {inviteUrl}
            </p>
            <div className="flex gap-2">
              <Button className="w-full" onClick={handleShareInvite}>
                공유하기
              </Button>
              <Button variant="secondary" className="w-full" onClick={handleCopyInvite}>
                {copyStatus === "copied" ? "복사됨!" : "링크 복사"}
              </Button>
            </div>
          </div>
        )}
        {inviteStatus === "error" && (
          <p className="mt-2 text-xs text-red-400">초대 링크 생성에 실패했어요. 다시 시도해주세요.</p>
        )}
      </Card>

      <div className="mt-6">
        <CardDescription className="mb-3">
          {friends === null ? "" : `친구 ${friends.length}명`}
        </CardDescription>

        {friends === null && (
          <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>
        )}

        {friends !== null && friends.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            아직 친구가 없어요. 초대 링크를 공유해보세요.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {friends?.map((friend) => (
            <FriendCard key={friend.userId} friend={friend} myTypeId={myTypeId} />
          ))}
        </div>
      </div>
    </div>
  );
}
