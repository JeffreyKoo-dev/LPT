"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";
import { GuardScreen } from "@/components/common/GuardScreen";
import { TextField } from "@/components/form/TextField";
import { PageHeading } from "@/components/common/PageHeading";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSupabaseSession } from "@/lib/useSupabaseSession";

type Status = "idle" | "sending" | "sent" | "verifying" | "error";

/** redirect 쿼리로 전달된 경로가 우리 앱 안의 안전한 경로인지 확인한다 (open redirect 방지) */
function getSafeRedirectPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-5 py-24 text-center text-sm text-muted">불러오는 중…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const session = useSupabaseSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // "방금 이 화면에서 로그인을 완료한 경우"에만 자동으로 이동시키고, 이미
  // 로그인된 상태로 이 페이지에 들어온 경우(예: 헤더의 "내 계정" 클릭)는
  // 자동으로 튕기지 않고 계정 화면(로그아웃 포함)을 그대로 보여준다.
  const initialCheckDone = useRef(false);
  const wasLoggedInOnLoad = useRef(false);

  useEffect(() => {
    if (session.loading || initialCheckDone.current) return;
    wasLoggedInOnLoad.current = !!session.user;
    initialCheckDone.current = true;
  }, [session.loading, session.user]);

  useEffect(() => {
    if (!initialCheckDone.current) return;
    if (session.user && !wasLoggedInOnLoad.current) {
      router.push(redirectPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user]);

  if (!session.configured) {
    return (
      <GuardScreen
        title="로그인 기능이 아직 설정되지 않았어요"
        description="관리자가 Supabase 연결을 완료하면 로그인을 사용할 수 있어요."
        actionLabel="홈으로"
        onAction={() => (window.location.href = "/")}
      />
    );
  }

  if (session.user) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <Card>
          <CardTitle>이미 로그인되어 있어요</CardTitle>
          <CardDescription className="mt-2">
            {session.user.email ?? "카카오 계정"}으로 로그인된 상태입니다.
          </CardDescription>
          <div className="mt-5 flex flex-col gap-3">
            <Button className="w-full" onClick={() => router.push(redirectPath)}>
              대시보드로 이동
            </Button>
            <Button variant="ghost" onClick={session.signOut}>
              로그아웃
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMessage(null);
    try {
      const supabase = getSupabaseClient();
      // 링크를 누르면 새 탭에서 로그인이 완료되는 문제를 피하기 위해, 링크
      // 대신 이메일에 함께 발급되는 6자리 코드를 같은 탭에서 입력받는다.
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (error) {
      console.error("[login] 이메일 코드 요청 실패", error);
      setErrorMessage("로그인 코드 발송에 실패했어요. 이메일 주소를 확인해주세요.");
      setStatus("error");
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus("verifying");
    setErrorMessage(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      // 성공하면 onAuthStateChange가 세션을 갱신하고, 위쪽 useEffect가 자동으로
      // redirectPath로 이동시킨다.
    } catch (error) {
      console.error("[login] 코드 확인 실패", error);
      setErrorMessage("코드가 올바르지 않거나 만료됐어요. 다시 시도해주세요.");
      setStatus("sent");
    }
  }

  async function handleKakaoLogin() {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: window.location.origin + redirectPath },
      });
      if (error) throw error;
    } catch (error) {
      console.error("[login] 카카오 로그인 실패", error);
      setErrorMessage("카카오 로그인에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <div className="mb-6">
        <PageHeading
          label="로그인"
          title="계정으로 기록을 이어가세요"
          description="성장 대시보드·퀘스트·뱃지는 로그인 후 이용할 수 있어요. 결과 리포트는 로그인 없이도 계속 확인할 수 있습니다."
        />
      </div>

      <Card>
        <Button variant="secondary" className="w-full" onClick={handleKakaoLogin}>
          카카오로 계속하기
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" />
          또는
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <TextField
            label="이메일"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "sent" || status === "verifying"}
          />
          {status !== "sent" && status !== "verifying" && (
            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "발송 중…" : "이메일로 로그인 코드 받기"}
            </Button>
          )}
        </form>

        {(status === "sent" || status === "verifying") && (
          <form onSubmit={handleVerifyCode} className="mt-4 flex flex-col gap-3">
            <p className="rounded-lg border border-growth/30 bg-growth-soft px-3 py-2 text-sm text-foreground">
              {email}로 코드를 보냈어요. 메일에 적힌 코드를 그대로 입력해주세요.
            </p>
            <TextField
              label="인증 코드"
              name="code"
              inputMode="numeric"
              placeholder="이메일에 적힌 코드"
              maxLength={12}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <Button type="submit" disabled={status === "verifying" || code.length < 4}>
              {status === "verifying" ? "확인 중…" : "로그인하기"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStatus("idle");
                setCode("");
                setErrorMessage(null);
              }}
            >
              다른 이메일로 다시 시도
            </Button>
          </form>
        )}

        {errorMessage && <p className="mt-4 text-sm text-red-400">{errorMessage}</p>}
      </Card>

      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/" className="underline underline-offset-2">
          홈으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
