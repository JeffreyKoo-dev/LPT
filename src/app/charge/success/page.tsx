"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";

type Status = "confirming" | "success" | "error";

export default function ChargeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-5 py-24 text-center text-sm text-muted">불러오는 중…</div>
      }
    >
      <ChargeSuccessContent />
    </Suspense>
  );
}

function ChargeSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("confirming");
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");

    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setErrorMessage("결제 정보가 올바르지 않아요.");
      return;
    }

    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "결제 승인에 실패했어요.");
        setNewBalance(data.newBalance ?? null);
        setStatus("success");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "결제 승인에 실패했어요.");
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <Card>
        {status === "confirming" && (
          <>
            <CardTitle>결제 확인 중이에요…</CardTitle>
            <CardDescription className="mt-2">잠시만 기다려주세요.</CardDescription>
          </>
        )}

        {status === "success" && (
          <>
            <CardTitle>충전이 완료됐어요</CardTitle>
            {newBalance !== null && (
              <CardDescription className="mt-2">
                현재 보유 캐시: {newBalance.toLocaleString()}캐시
              </CardDescription>
            )}
            <Button className="mt-5 w-full" onClick={() => router.push("/dashboard")}>
              대시보드로
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <CardTitle>결제 확인에 실패했어요</CardTitle>
            <CardDescription className="mt-2">{errorMessage}</CardDescription>
            <p className="mt-2 text-xs text-muted">
              결제가 실제로 됐다면 캐시가 곧 반영될 수 있어요. 계속 문제가 있으면 문의해주세요.
            </p>
            <Button variant="secondary" className="mt-5 w-full" onClick={() => router.push("/charge")}>
              다시 시도하기
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
