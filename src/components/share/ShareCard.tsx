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
    return { Icon: TrendingUp, color: "#d9954a" };
  }
  return { Icon: Award, color: "#d9954a" };
}

/**
 * PNG로 내보낼 실제 카드 DOM. html-to-image가 이 요소를 그대로 캡처하므로
 * Tailwind 유틸리티 대신 인라인 스타일 위주로 작성해 캡처 호환성을 높였다.
 * (인라인 스타일이라 globals.css 색상 변경이 자동으로 반영되지 않는다 —
 * 팔레트를 바꿀 때는 이 파일의 색상값도 함께 맞춰야 한다.)
 */
export const ShareCard = forwardRef<HTMLDivElement, { data: ShareCardData }>(function ShareCard(
  { data },
  ref
) {
  const { Icon, color } = getIconAccent(data);
  const isCharacterCard = data.kind === "character" && !!data.illustrationSlug;

  return (
    <div
      ref={ref}
      style={{
        width: 360,
        height: 480,
        borderRadius: 20,
        padding: 32,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, #fff8ef 0%, #ffe8d1 100%)",
        border: "1px solid #f0d9bd",
        borderTop: "4px solid #8a5fae",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#4a3728",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <div>
        {isCharacterCard ? (
          <div
            style={{
              width: 88,
              height: 110,
              borderRadius: 12,
              overflow: "hidden",
              background: "#fef0e0",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image 캡처 호환을 위해 next/image 대신 일반 img 사용 */}
            <img
              src={`/characters/${data.illustrationSlug}.svg`}
              alt=""
              width={88}
              height={110}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              height: 56,
              width: 56,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              border: `1px solid ${color}55`,
              background: `${color}22`,
            }}
          >
            <Icon size={26} strokeWidth={1.75} color={color} />
          </div>
        )}

        <span
          style={{
            display: "inline-block",
            marginTop: 16,
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(138,95,174,0.3)",
            background: "rgba(138,95,174,0.12)",
            color: "#8a5fae",
            letterSpacing: "0.01em",
          }}
        >
          {data.badge}
        </span>
        <p style={{ marginTop: 16, fontSize: 13, color: "#9c8770" }}>{data.nickname}님</p>
        <h1
          style={{
            marginTop: 8,
            fontFamily: "'Jua', sans-serif",
            fontWeight: 400,
            fontSize: 32,
            lineHeight: 1.3,
          }}
        >
          {data.heading}
        </h1>
        <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "#9c8770" }}>
          {data.subheading}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <p style={{ fontSize: 11, color: "#b5a48c" }}>Life Pattern Type</p>
        <p style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em", color: "#4a3728" }}>LPT</p>
      </div>
    </div>
  );
});
