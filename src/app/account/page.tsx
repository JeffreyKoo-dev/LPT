"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/common/PageHeading";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { TextField } from "@/components/form/TextField";
import { GuardScreen } from "@/components/common/GuardScreen";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { getSupabaseClient } from "@/lib/supabase/client";
import { checkNicknameLocally } from "@/lib/contentModeration";
import { checkContentWithAi } from "@/lib/moderationApi";
import { updateNickname, exportMyData, deleteMyAccount } from "@/lib/account";
import { getWalletBalance, getWalletTransactions, WalletTransaction } from "@/lib/wallet";
import { listMySharedProfiles, revokeSharedProfile, MySharedLink } from "@/lib/publicShare";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { BasicInfo } from "@/types/user";

const SHARE_KIND_LABEL: Record<string, string> = {
  character: "캐릭터 카드",
  level: "레벨업 카드",
  badge: "뱃지 카드",
};

/** Supabase Auth가 리다이렉트에 담아 보내는 에러 코드를 사람이 읽을 문구로 바꾼다. */
function describeAuthError(code: string): string {
  if (code === "identity_already_exists") {
    return "이 카카오 계정은 이미 다른 계정에 연결되어 있어요. 그 계정에서 먼저 연결을 해제하거나, 다른 카카오 계정을 사용해주세요.";
  }
  return "연결 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
}

export default function AccountPage() {
  const router = useRouter();
  const authGate = useRequireLogin();

  if (authGate.configured && (authGate.loading || authGate.redirecting)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        로그인 확인 중입니다…
      </div>
    );
  }

  if (!authGate.configured || !authGate.user) {
    return (
      <GuardScreen
        title="로그인이 필요해요"
        description="계정 정보를 보려면 먼저 로그인해주세요."
        actionLabel="로그인하러 가기"
        onAction={() => router.push("/login")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <PageHeading label="내 계정" title="계정 관리" />

      <AccountSummarySection email={authGate.user.email ?? null} onSignOut={authGate.signOut} />
      <NicknameSection />
      <WalletSummarySection />
      <LinkedIdentitiesSection />
      <SharedLinksSection />
      <DataExportSection />
      <DangerZoneSection />
    </div>
  );
}

/** 로그인 정보 + 로그아웃 */
function AccountSummarySection({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  return (
    <Card>
      <CardTitle>로그인 정보</CardTitle>
      <CardDescription className="mt-2">{email ?? "카카오 계정"}으로 로그인된 상태입니다.</CardDescription>
      <Button variant="ghost" className="mt-4 w-full" onClick={onSignOut}>
        로그아웃
      </Button>
    </Card>
  );
}

/** 닉네임 변경 — 기존 검수(로컬 키워드 + AI)를 그대로 거친다 */
function NicknameSection() {
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const basicInfo = getStorage().get<BasicInfo>(STORAGE_KEYS.basicInfo);
    if (basicInfo?.nickname) setNickname(basicInfo.nickname);
  }, []);

  async function handleSave() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    setError(null);

    const localCheck = checkNicknameLocally(trimmed);
    if (!localCheck.allowed) {
      setError(localCheck.reason ?? "사용할 수 없는 닉네임이에요.");
      return;
    }

    setStatus("checking");
    const aiCheck = await checkContentWithAi("nickname", trimmed);
    if (!aiCheck.allowed) {
      setError(aiCheck.reason ?? "사용할 수 없는 닉네임이에요.");
      setStatus("idle");
      return;
    }

    setStatus("saving");
    try {
      await updateNickname(trimmed);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경에 실패했어요.");
      setStatus("idle");
    }
  }

  return (
    <Card className="mt-6">
      <CardTitle>닉네임</CardTitle>
      <div className="mt-3">
        <TextField
          label=""
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          error={error ?? undefined}
          maxLength={20}
        />
      </div>
      <Button
        className="mt-3 w-full"
        onClick={handleSave}
        disabled={status === "checking" || status === "saving"}
      >
        {status === "checking" ? "확인 중…" : status === "saving" ? "저장 중…" : status === "saved" ? "저장됐어요" : "변경하기"}
      </Button>
    </Card>
  );
}

/** 캐시 잔액 + 최근 거래 요약 (대시보드의 WalletSection보다 간단한 버전) */
function WalletSummarySection() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([getWalletBalance(), getWalletTransactions(3)]).then(([bal, tx]) => {
      setBalance(bal);
      setTransactions(tx);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between">
        <CardTitle>보유 캐시</CardTitle>
        <p className="text-lg font-semibold text-foreground">{(balance ?? 0).toLocaleString()}캐시</p>
      </div>
      {transactions.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex justify-between text-xs text-muted">
              <span>{new Date(tx.created_at).toLocaleDateString("ko-KR")}</span>
              <span>
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toLocaleString()}캐시
              </span>
            </div>
          ))}
        </div>
      )}
      <a href="/charge" className="mt-3 block text-center text-sm text-fate underline underline-offset-2">
        캐시 충전하기
      </a>
    </Card>
  );
}

/** 연결된 로그인 수단(카카오 연결/해제) — Supabase 대시보드의 "Manual Linking" 설정이 켜져 있어야 동작한다 */
function LinkedIdentitiesSection() {
  const [hasKakao, setHasKakao] = useState<boolean | null>(null);
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUserIdentities().then((res: { data: { identities: { provider: string }[] } | null }) => {
      setHasKakao(!!res.data?.identities.some((i) => i.provider === "kakao"));
    });

    // 카카오 연결이 실패하면(이미 다른 계정에 연결된 카카오 등) Supabase가
    // 이 페이지로 되돌아오면서 쿼리/해시에 에러 정보를 담아준다. 조용히
    // 홈으로 튕기지 않도록, 여기서 파싱해 이유를 보여주고 URL을 정리한다.
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorCode = params.get("error_code") ?? hashParams.get("error_code");
    if (errorCode) {
      setError(describeAuthError(errorCode));
      window.history.replaceState(null, "", window.location.pathname);
    }

    // 카카오 로그인 페이지로 갔다가 뒤로가기로 돌아오면, 브라우저가 페이지를 새로
    // 불러오지 않고 이전 상태(연결 시도 중이던 화면)를 그대로 복원하는 경우가 있다
    // (bfcache). 이때 "연결하는 중…"에 멈춰있지 않도록, 복원 이벤트에서 상태를
    // 초기화한다.
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setStatus("idle");
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleLinkKakao() {
    setError(null);
    setStatus("working");
    try {
      const supabase = getSupabaseClient();
      const { error: linkError } = await supabase.auth.linkIdentity({
        provider: "kakao",
        options: { redirectTo: `${window.location.origin}/account` },
      });
      if (linkError) throw linkError;
      // 성공 시 카카오 인증 페이지로 리다이렉트되므로 이후 코드는 보통 실행되지 않는다.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "연결에 실패했어요. Supabase 대시보드에서 Manual Linking 설정이 켜져 있는지 확인해주세요."
      );
      setStatus("idle");
    }
  }

  if (hasKakao === null) return null;

  return (
    <Card className="mt-6">
      <CardTitle>연결된 로그인 수단</CardTitle>
      <CardDescription className="mt-1">
        여러 방법을 연결해두면 하나를 잃어버려도 다른 방법으로 로그인할 수 있어요.
      </CardDescription>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-foreground">카카오</span>
        {hasKakao ? (
          <span className="text-emerald-700">연결됨</span>
        ) : (
          <Button variant="secondary" onClick={handleLinkKakao} disabled={status === "working"}>
            {status === "working" ? "연결하는 중…" : "연결하기"}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
  );
}

/** 내가 만든 공개 공유 링크 목록 + 비활성화(삭제) */
function SharedLinksSection() {
  const [links, setLinks] = useState<MySharedLink[] | null>(null);

  useEffect(() => {
    listMySharedProfiles().then(setLinks);
  }, []);

  async function handleRevoke(id: string) {
    const ok = await revokeSharedProfile(id);
    if (ok) setLinks((prev) => prev?.filter((l) => l.id !== id) ?? null);
  }

  if (links === null) return null;

  return (
    <Card className="mt-6">
      <CardTitle>공개한 공유 링크</CardTitle>
      <CardDescription className="mt-1">
        &ldquo;결과 보기 허용&rdquo;으로 공개한 링크예요. 더 이상 공개하고 싶지 않으면 지울 수 있어요.
      </CardDescription>
      {links.length === 0 ? (
        <p className="mt-4 text-sm text-muted">공개한 링크가 없어요.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            >
              <div>
                <p className="text-foreground">{SHARE_KIND_LABEL[link.kind] ?? link.kind}</p>
                <p className="text-xs text-muted">
                  {link.heading} · {new Date(link.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <Button variant="ghost" onClick={() => handleRevoke(link.id)}>
                삭제
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** 내 데이터 JSON 다운로드 */
function DataExportSection() {
  const [status, setStatus] = useState<"idle" | "preparing">("idle");

  async function handleExport() {
    setStatus("preparing");
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lpt-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <Card className="mt-6">
      <CardTitle>내 데이터 내보내기</CardTitle>
      <CardDescription className="mt-1">
        지금까지 쌓인 내 정보를 파일로 내려받을 수 있어요.
      </CardDescription>
      <Button variant="secondary" className="mt-3 w-full" onClick={handleExport} disabled={status === "preparing"}>
        {status === "preparing" ? "준비 중…" : "JSON으로 내려받기"}
      </Button>
    </Card>
  );
}

/** 계정 탈퇴 — 위험 구역, 맨 아래에 배치하고 확인 문구를 요구한다 */
function DangerZoneSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmText !== "탈퇴") {
      setError('정확히 "탈퇴"라고 입력해주세요.');
      return;
    }
    setError(null);
    setStatus("deleting");
    try {
      await deleteMyAccount();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "탈퇴 처리에 실패했어요.");
      setStatus("idle");
    }
  }

  return (
    <Card className="mt-6 border-t-2 border-t-red-600/40">
      <CardTitle>계정 탈퇴</CardTitle>
      <CardDescription className="mt-1">
        탈퇴하면 사주 분석, 성장 기록, 캐시 잔액을 포함한 모든 데이터가 삭제되며 되돌릴 수 없어요.
      </CardDescription>

      {!confirming ? (
        <Button variant="ghost" className="mt-3 w-full text-red-600" onClick={() => setConfirming(true)}>
          계정 탈퇴하기
        </Button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <TextField
            label='계속하려면 "탈퇴"라고 입력해주세요'
            name="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="secondary" className="w-full" onClick={() => setConfirming(false)}>
              취소
            </Button>
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={status === "deleting"}
            >
              {status === "deleting" ? "처리 중…" : "완전히 삭제"}
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </Card>
  );
}
