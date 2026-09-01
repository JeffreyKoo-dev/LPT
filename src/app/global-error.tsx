"use client";

import { useEffect } from "react";

/**
 * 루트 레이아웃(app/layout.tsx) 자체에서 발생하는 예외까지 잡는 최상위 에러
 * 바운더리. error.tsx는 레이아웃 안쪽만 감싸므로, 레이아웃 자체가 깨지는
 * 드문 경우를 대비해 별도로 둔다. 자체 <html>/<body>를 포함해야 한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff6ec",
          color: "#4a3728",
          fontFamily: "-apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 360, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>문제가 발생했어요</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#9c8770", lineHeight: 1.6 }}>
            서비스를 불러오는 중 오류가 발생했습니다. 아래 버튼으로 다시
            시도해주세요.
          </p>
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={reset}
              style={{
                height: 44,
                borderRadius: 8,
                border: "none",
                background: "#8a5fae",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              다시 시도하기
            </button>
            <button
              onClick={() => {
                try {
                  const keysToRemove: string[] = [];
                  for (let i = 0; i < window.localStorage.length; i++) {
                    const key = window.localStorage.key(i);
                    if (key?.startsWith("lpt:")) keysToRemove.push(key);
                  }
                  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
                } catch {
                  // LocalStorage 접근이 막힌 환경이면 조용히 넘어간다
                }
                window.location.href = "/";
              }}
              style={{
                height: 44,
                borderRadius: 8,
                border: "1px solid #f0d9bd",
                background: "transparent",
                color: "#4a3728",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              데이터 초기화하고 홈으로
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
