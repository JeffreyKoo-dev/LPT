import { forwardRef } from "react";
import { ShareCardData } from "@/lib/share";

/**
 * PNG로 내보낼 실제 카드 DOM. html-to-image가 이 요소를 그대로 캡처하므로
 * Tailwind 유틸리티 대신 인라인 스타일 위주로 작성해 캡처 호환성을 높였다.
 * 장식(블러 블롭, 그라디언트) 없이 단색 배경 + 좌측 강조 바로만 구성했다.
 */
export const ShareCard = forwardRef<HTMLDivElement, { data: ShareCardData }>(function ShareCard(
  { data },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        width: 360,
        height: 480,
        borderRadius: 16,
        padding: 32,
        position: "relative",
        overflow: "hidden",
        background: "#131316",
        border: "1px solid #26262b",
        borderTop: "3px solid #5b5bd6",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#ededef",
        fontFamily: "var(--font-sans), sans-serif",
      }}
    >
      <div>
        <span
          style={{
            display: "inline-block",
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid rgba(91,91,214,0.35)",
            background: "rgba(91,91,214,0.12)",
            color: "#8482e0",
            letterSpacing: "0.01em",
          }}
        >
          {data.badge}
        </span>
        <p style={{ marginTop: 20, fontSize: 13, color: "#8b8b93" }}>{data.nickname}님</p>
        <h1
          style={{
            marginTop: 8,
            fontFamily: "var(--font-sans), sans-serif",
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}
        >
          {data.heading}
        </h1>
        <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "#8b8b93" }}>
          {data.subheading}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <p style={{ fontSize: 11, color: "#58585f" }}>Life Pattern Type</p>
        <p style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>LPT</p>
      </div>
    </div>
  );
});
