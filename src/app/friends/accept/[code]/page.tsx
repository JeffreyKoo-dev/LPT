"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { getPendingInvite, acceptFriendInvite, PendingInvite } from "@/lib/friends";
import { getLptTypeMeta } from "@/data/lptTypes";

type Status = "loading" | "found" | "not-found" | "accepting" | "accepted" | "error";

export default function AcceptFriendInvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const authGate = useRequireLogin();

  const [status, setStatus] = useState<Status>("loading");
  const [invite, setInvite] = useState<PendingInvite | null>(null);

  useEffect(() => {
    if (authGate.configured && (authGate.loading || authGate.redirecting)) return;
    getPendingInvite(params.code)
      .then((result) => {
        if (!result) {
          setStatus("not-found");
        } else {
          setInvite(result);
          setStatus("found");
        }
      })
      .catch(() => setStatus("not-found"));
  }, [params.code, authGate.configured, authGate.loading, authGate.redirecting]);

  if (authGate.configured && (authGate.loading || authGate.redirecting)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        로그인 확인 중입니다…
      </div>
    );
  }

  async function handleAccept() {
    setStatus("accepting");
    try {
      await acceptFriendInvite(params.code);
      setStatus("accepted");
    } catch (error) {
      console.error("[friends] 초대 수락 실패", error);
      setStatus("error");
    }
  }

  const typeMeta = invite?.requesterTypeId ? getLptTypeMeta(invite.requesterTypeId) : undefined;

  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      {status === "loading" && <p className="text-sm text-muted">확인하는 중입니다…</p>}

      {status === "not-found" && (
        <Card>
          <CardTitle>유효하지 않은 초대예요</CardTitle>
          <CardDescription className="mt-2">
            이미 사용됐거나 존재하지 않는 초대 링크입니다.
          </CardDescription>
          <Button className="mt-5" onClick={() => router.push("/")}>
            홈으로
          </Button>
        </Card>
      )}

      {(status === "found" || status === "accepting") && invite && (
        <Card>
          <CardTitle>
            {invite.requesterNickname}님의 친구 요청
          </CardTitle>
          <CardDescription className="mt-2">
            {typeMeta ? `${typeMeta.name} 유형이에요. ` : ""}
            수락하면 서로의 유형과 성장 기록을 확인할 수 있어요.
          </CardDescription>
          <Button className="mt-5 w-full" onClick={handleAccept} disabled={status === "accepting"}>
            {status === "accepting" ? "수락하는 중…" : "친구 요청 수락하기"}
          </Button>
        </Card>
      )}

      {status === "accepted" && (
        <Card>
          <CardTitle>친구가 됐어요!</CardTitle>
          <CardDescription className="mt-2">
            {invite?.requesterNickname}님과 이제 서로의 유형을 비교할 수 있어요.
          </CardDescription>
          <Button className="mt-5 w-full" onClick={() => router.push("/friends")}>
            친구 목록 보기
          </Button>
        </Card>
      )}

      {status === "error" && (
        <Card>
          <CardTitle>수락에 실패했어요</CardTitle>
          <CardDescription className="mt-2">잠시 후 다시 시도해주세요.</CardDescription>
          <Button className="mt-5" onClick={handleAccept}>
            다시 시도
          </Button>
        </Card>
      )}
    </div>
  );
}
