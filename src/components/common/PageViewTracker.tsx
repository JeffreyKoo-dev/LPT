"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

/** 라우트가 바뀔 때마다 page_view를 기록한다 (관리자 화면은 제외). */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    track("page_view");
  }, [pathname]);
  return null;
}
