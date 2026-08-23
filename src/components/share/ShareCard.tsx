import { forwardRef } from "react";
import { TrendingUp, Award } from "lucide-react";
import { ShareCardData } from "@/lib/share";
import { ELEMENT_ICON_COMPONENT, ELEMENT_HEX } from "@/components/common/ElementIcon";

/** 카드 아이콘 배지의 강조색을 결정한다 (오행 카드는 원소색, 그 외엔 growth 톤 고정) */
function getIconAccent(data: ShareCardData): { Icon: typeof TrendingUp; color: string } {
  if (data.icon.kind === "element") {
    return { Icon: ELEMENT_ICON_COMPONENT[data.icon.element], color: ELEMENT_HEX[data.icon.element] };
  }
  if (data.icon.kind === "level") {
    return { Icon: TrendingUp, color: "#b8863d" };
  }
  return { Icon: Award, color: "#b8863d" };
}

/**
 * PNG로 내보낼 실제 카드 DOM. html-to-image가 이 요소를 그대로 캡처하므로
 * Tailwind 유틸리티 대신 인라인 스타일 위주로 작성해 캡처 호환성을 높였다.
 * 장식(블러 블롭, 그라디언트) 없이 단색 배경 + 좌측 강조 바 + 아이콘 배지로만 구성했다.
 */
export const ShareCard = forwardRef<HTMLDivElement, { data: ShareCardData }>(function ShareCard(
  { data },
  ref
) {
  const { Icon, color } = getIconAccent(data);

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
        <div
          style={{
            display: "flex",
            height: 56,
            width: 56,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            border: `1px solid ${color}55`,
            background: `${color}1f`,
          }}
        >
          <Icon size={26} strokeWidth={1.75} color={color} />
        </div>

        <span
          style={{
            display: "inline-block",
            marginTop: 16,
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
        <p style={{ marginTop: 16, fontSize: 13, color: "#8b8b93" }}>{data.nickname}님</p>
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
