"use client";

import { RefObject, useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/common/Button";

interface ShareActionsProps {
  targetRef: RefObject<HTMLDivElement>;
  fileName: string;
  shareTitle?: string;
  shareText?: string;
}

export function ShareActions({
  targetRef,
  fileName,
  shareTitle = "LPT — Life Pattern Type",
  shareText = "내 라이프 패턴 결과를 확인해보세요",
}: ShareActionsProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing">("idle");
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
   * 이미지 파일을 함께 공유하려던 이전 버전은, 파일 공유를 지원하지 않는 앱이
   * 많아 "일부 방법만 표시됩니다" 같은 경고와 함께 공유 대상 목록이 크게
   * 줄어드는 문제가 있었다. 그래서 링크(+텍스트)만 공유하도록 단순화했다 —
   * 이미지 자체는 "PNG로 저장하기" 버튼으로 별도로 받을 수 있다.
   */
  async function handleShare() {
    setShareStatus("sharing");
    try {
      await navigator.share({ title: shareTitle, text: shareText, url: window.location.href });
    } catch (error) {
      // 사용자가 공유시트를 취소한 경우(AbortError)는 정상 흐름이라 에러로 취급하지 않는다
      if ((error as Error).name !== "AbortError") {
        console.error("[share] 공유 실패", error);
      }
    } finally {
      setShareStatus("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {canUseWebShare && (
        <Button className="w-full" onClick={handleShare} disabled={shareStatus === "sharing"}>
          {shareStatus === "sharing" ? "공유 준비 중…" : "카카오톡·인스타그램 등으로 공유하기"}
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
