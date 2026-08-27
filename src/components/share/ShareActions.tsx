"use client";

import { RefObject, useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/common/Button";
import { isKakaoShareConfigured, shareToKakao } from "@/lib/kakaoShare";
import { buildFacebookShareUrl, buildXShareUrl, buildSmsShareUrl } from "@/lib/shareLinks";

interface ShareActionsProps {
  targetRef: RefObject<HTMLDivElement>;
  fileName: string;
  shareTitle: string;
  shareDescription: string;
}

/**
 * 플랫폼별 공유 버튼 모음.
 *
 * 카카오톡·페이스북·X·문자는 각각 독립된 방식(카카오 SDK / 직접 링크)으로
 * 동작해, 하나의 API(navigator.share)에 의존하지 않는다. Web Share API는
 * 안드로이드 기기·OS 버전에 따라 공유 대상 목록이 비정상적으로 비는 문제가
 * 실기기 확인 결과 재현되어(게스트 모드에서도 동일), 주력 방식에서
 * "기타 앱으로 공유"라는 보조 옵션으로 내렸다.
 */
export function ShareActions({ targetRef, fileName, shareTitle, shareDescription }: ShareActionsProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [canUseWebShare, setCanUseWebShare] = useState(false);
  const [kakaoError, setKakaoError] = useState(false);

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

  async function handleKakaoShare() {
    setKakaoError(false);
    try {
      await shareToKakao({ title: shareTitle, description: shareDescription, url: window.location.href });
    } catch (error) {
      console.error("[share] 카카오톡 공유 실패", error);
      setKakaoError(true);
    }
  }

  function handleFacebookShare() {
    window.open(buildFacebookShareUrl(window.location.href), "_blank", "noopener,noreferrer");
  }

  function handleXShare() {
    window.open(buildXShareUrl(window.location.href, shareTitle), "_blank", "noopener,noreferrer");
  }

  function handleSmsShare() {
    window.location.href = buildSmsShareUrl(window.location.href, shareTitle);
  }

  async function handleWebShare() {
    try {
      await navigator.share({ url: window.location.href });
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("[share] 공유 실패", error);
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {isKakaoShareConfigured() && (
          <Button variant="secondary" onClick={handleKakaoShare}>
            카카오톡
          </Button>
        )}
        <Button variant="secondary" onClick={handleFacebookShare}>
          페이스북
        </Button>
        <Button variant="secondary" onClick={handleXShare}>
          X
        </Button>
        <Button variant="secondary" onClick={handleSmsShare}>
          문자
        </Button>
      </div>
      {kakaoError && (
        <p className="text-xs text-red-400">카카오톡 공유에 실패했어요. 잠시 후 다시 시도해주세요.</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
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

      {canUseWebShare && (
        <Button variant="ghost" className="w-full" onClick={handleWebShare}>
          기타 앱으로 공유 (기기 공유 메뉴)
        </Button>
      )}
    </div>
  );
}
