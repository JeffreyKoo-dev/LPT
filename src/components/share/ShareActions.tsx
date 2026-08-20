"use client";

import { RefObject, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/common/Button";

interface ShareActionsProps {
  targetRef: RefObject<HTMLDivElement>;
  fileName: string;
}

export function ShareActions({ targetRef, fileName }: ShareActionsProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

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

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button className="w-full" onClick={handleSavePng} disabled={status === "saving"}>
        {status === "saving" ? "저장 중…" : status === "saved" ? "다시 저장하기" : "PNG로 저장하기"}
      </Button>
      <Button variant="secondary" className="w-full" onClick={handleCopyLink}>
        {copyStatus === "copied" ? "링크 복사됨!" : "링크 복사하기"}
      </Button>
    </div>
  );
}
