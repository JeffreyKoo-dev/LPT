import { forwardRef } from "react";
import { TrendingUp, Award } from "lucide-react";
import { ShareCardData } from "@/lib/share";
import { ELEMENT_ICON_COMPONENT, ELEMENT_HEX } from "@/components/common/ElementIcon";

/** 카드 아이콘의 색상을 결정한다 (오행 카드는 원소색, 그 외엔 growth 톤 고정) */
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
 *
 * 알약 배지, 테두리+틴트 배경 아이콘 박스, 상단 강조선 같은 "전형적인 SaaS
 * 알림 카드" 장식을 걷어냈다. 캐릭터 일러스트 자체가 이미 시선을 끄는
 * 요소라, 카드 틀은 최대한 단순하게 — 여백과 타이포그래피 위계로만
 * 정보를 구분한다.
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
        padding: 36,
        position: "relative",
        overflow: "hidden",
        background: "#fff8ef",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#4a3728",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <div>
        {isCharacterCard ? (
          <div style={{ width: 96, height: 120, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image 캡처 호환을 위해 next/image 대신 일반 img 사용 */}
            <img
              src={`/characters/${data.illustrationSlug}.svg`}
              alt=""
              width={96}
              height={120}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          </div>
        ) : (
          <Icon size={32} strokeWidth={1.5} color={color} />
        )}

        <p style={{ marginTop: 24, fontSize: 13, color: "#9c8770" }}>{data.badge}</p>
        <p style={{ marginTop: 2, fontSize: 13, color: "#9c8770" }}>{data.nickname}님</p>
        <h1
          style={{
            marginTop: 6,
            fontFamily: "'Jua', sans-serif",
            fontWeight: 400,
            fontSize: 34,
            lineHeight: 1.3,
          }}
        >
          {data.heading}
        </h1>
        <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "#6b5a47" }}>
          {data.subheading}
        </p>
      </div>

      <div>
        <div style={{ height: 1, background: "#e8d9c0", marginBottom: 16 }} />
        <p style={{ fontSize: 12, letterSpacing: "0.02em", color: "#9c8770" }}>Life Pattern Type</p>
      </div>
    </div>
  );
});
