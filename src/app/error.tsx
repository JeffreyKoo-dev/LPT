"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";

/**
 * Next.js App Router의 세그먼트 에러 바운더리.
 * 렌더링 중 처리되지 않은 예외가 발생하면(예: 배포 전 저장된 예전 형식의
 * LocalStorage 데이터가 새 코드와 맞지 않아 발생하는 크래시) 흰 화면 대신
 * 이 화면이 대신 뜬다. 사용자가 직접 복구할 수 있는 두 가지 선택지를 제공한다.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  function handleResetData() {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith("lpt:")) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // LocalStorage 접근 자체가 막힌 환경이면 조용히 넘어간다
    }
    window.location.href = "/start";
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-5">
      <Card className="w-full text-center">
        <CardTitle>문제가 발생했어요</CardTitle>
        <CardDescription className="mt-2">
          예상치 못한 오류로 화면을 불러오지 못했습니다. 서비스 업데이트 직후라면
          기기에 저장된 이전 데이터 때문일 수 있어요. 아래에서 다시 시도해보세요.
        </CardDescription>

        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={reset}>다시 시도하기</Button>
          <Link href="/">
            <Button variant="secondary" className="w-full">
              홈으로 이동
            </Button>
          </Link>
          <Button variant="ghost" onClick={handleResetData}>
            내 데이터 초기화하고 새로 시작하기
          </Button>
        </div>
      </Card>
    </div>
  );
}
