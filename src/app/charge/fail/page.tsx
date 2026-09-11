"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";

export default function ChargeFailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-5 py-24 text-center text-sm text-muted">불러오는 중…</div>
      }
    >
      <ChargeFailContent />
    </Suspense>
  );
}

function ChargeFailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <Card>
        <CardTitle>결제가 완료되지 않았어요</CardTitle>
        <CardDescription className="mt-2">
          {message ?? "결제를 취소하셨거나 처리 중 문제가 발생했어요."}
        </CardDescription>
        <Button className="mt-5 w-full" onClick={() => router.push("/charge")}>
          다시 시도하기
        </Button>
      </Card>
    </div>
  );
}
