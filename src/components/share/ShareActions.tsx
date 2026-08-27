"use client";

import { RefObject, useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/common/Button";

interface ShareActionsProps {
  targetRef: RefObject<HTMLDivElement>;
  fileName: string;
}

export function ShareActions({ targetRef, fileName }: ShareActionsProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [canUseWebShare, setCanUseWebShare] = useState(false);

  // navigator는 서버 렌더링 시 없으므로 마운트 이후에만 기능 지원 여부를 확인한다
  useEffect(() => {
    setCanUseWebShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function handleSavePng() {
    if (!targetRef.current) return;
    setStatus("saving");
    try {
      const dataUrl = await toPng(targetRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
      setStatus("saved");
    } catch (error) {
      console.error("[share] PNG 저장 실패", error);
      setStatus("error");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (error) {
      console.error("[share] 링크 복사 실패", error);
    }
  }

  /**
   * OS 기본 공유시트를 연다. 카카오톡·인스타그램·페이스북·문자 등 기기에 설치된
   * 앱이 시트에 자동으로 뜬다 (플랫폼별 SDK·앱키 불필요).
   *
   * title/text를 url과 함께 보내면 일부 안드로이드 기기에서 공유 대상 목록이
   * 거의 비어버리는 문제가 확인되어(안드로이드가 title+text+url 조합을 순수
   * 링크 공유와 다르게 처리하는 것으로 추정), 링크만 단독으로 공유하도록
   * 단순화했다. 카카오톡 등에서 링크를 열면 어차피 페이지 자체의 내용으로
   * 미리보기가 구성되므로 실사용에는 차이가 없다. 상태 표시용 state도
   * 제거했다 — 공유 호출 자체가 즉시 실행돼야 안드로이드가 "방금 사용자가
   * 직접 눌렀다"는 신호(user activation)를 확실히 인식한다.
   */
  async function handleShare() {
    try {
      await navigator.share({ url: window.location.href });
    } catch (error) {
      // 사용자가 공유시트를 취소한 경우(AbortError)는 정상 흐름이라 에러로 취급하지 않는다
      if ((error as Error).name !== "AbortError") {
        console.error("[share] 공유 실패", error);
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {canUseWebShare && (
        <Button className="w-full" onClick={handleShare}>
          카카오톡·인스타그램 등으로 공유하기
        </Button>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant={canUseWebShare ? "secondary" : "primary"}
          className="w-full"
          onClick={handleSavePng}
          disabled={status === "saving"}
        >
          {status === "saving" ? "저장 중…" : status === "saved" ? "다시 저장하기" : "PNG로 저장하기"}
        </Button>
        <Button variant="secondary" className="w-full" onClick={handleCopyLink}>
          {copyStatus === "copied" ? "링크 복사됨!" : "링크 복사하기"}
        </Button>
      </div>
    </div>
  );
}
