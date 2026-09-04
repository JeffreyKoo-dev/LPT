"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";
import { ShareCard } from "@/components/share/ShareCard";
import { fetchSharedProfile } from "@/lib/publicShare";
import { ShareCardData } from "@/lib/share";

/**
 * 공유 링크를 받은 사람이 로그인이나 자기 기기의 데이터 없이도 결과를
 * 볼 수 있는 공개 페이지. 카드를 공유한 사람이 "결과 보기 허용"에
 * 동의했을 때만 생성되는 링크(shared_profiles)를 조회한다.
 */
export default function ViewSharedProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
  const [data, setData] = useState<ShareCardData | null>(null);

  useEffect(() => {
    fetchSharedProfile(params.id).then((result) => {
      if (result) {
        setData(result);
        setStatus("found");
      } else {
        setStatus("not-found");
      }
    });
  }, [params.id]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center text-sm text-muted">
        불러오는 중입니다…
      </div>
    );
  }

  if (status === "not-found" || !data) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <Card>
          <CardTitle>결과를 찾을 수 없어요</CardTitle>
          <CardDescription className="mt-2">
            링크가 만료됐거나, 더 이상 공개되지 않는 결과일 수 있어요.
          </CardDescription>
          <Button className="mt-5 w-full" onClick={() => router.push("/")}>
            홈으로
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <div className="mb-6 text-center">
        <p className="text-xs text-muted">공유받은 결과</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
          {data.nickname}님이 공유한 결과예요
        </h1>
      </div>

      <div className="flex justify-center">
        <ShareCard data={data} />
      </div>

      <Card className="mt-6 text-center">
        <CardDescription>
          나의 사주와 성향을 결합한 라이프 패턴 유형이 궁금하다면, 지금 바로
          확인해보세요.
        </CardDescription>
        <Button className="mt-4 w-full" onClick={() => router.push("/start")}>
          내 유형 알아보기
        </Button>
      </Card>
    </div>
  );
}
