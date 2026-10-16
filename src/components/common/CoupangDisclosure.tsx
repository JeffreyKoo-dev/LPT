import { cn } from "@/lib/utils";

/**
 * 쿠팡 파트너스 대가성 문구. 쿠팡 파트너스 활동 시 제휴 링크가 노출되는 곳에
 * 반드시 함께 표시해야 한다(공정거래위원회 심사지침: 추천·보증인과 사업자의
 * 경제적 이해관계 공개). 문구는 쿠팡이 안내한 표현 그대로 유지할 것.
 *
 * 쿠팡 "채널별 경제적 이해관계 표시 가이드" 요약:
 * - "소정의 수수료를 지급받을 수 있음" 같은 조건부·불확정 표현은 금지.
 * - 소비자가 쉽게 볼 수 있는 위치(제휴 링크보다 위, 콘텐츠 첫 부분)에 표시.
 *   링크·배너·이미지 하단이나 태그에 쓰면 위반. 본문보다 크거나 눈에 띄는 색.
 * - 제휴 링크와 문구를 분리해서 쓰면 안 됨. 링크는 수신 동의 없는 메시지에 넣지 않는다.
 */
export const COUPANG_DISCLOSURE_TEXT =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

interface CoupangDisclosureProps {
  className?: string;
  /**
   * "prominent": 제휴 링크 바로 위에 두는 본 표시. 쿠팡 가이드상 본문보다 크거나
   * 눈에 띄는 색이어야 하므로 강조색·굵기를 쓴다.
   * "subtle": 푸터처럼 보조로 한 번 더 알리는 용도.
   */
  variant?: "prominent" | "subtle";
}

export function CoupangDisclosure({ className, variant = "subtle" }: CoupangDisclosureProps) {
  return (
    <p
      className={cn(
        variant === "prominent"
          ? "text-sm font-semibold leading-snug text-fate"
          : "text-[11px] leading-relaxed text-muted",
        className
      )}
    >
      {COUPANG_DISCLOSURE_TEXT}
    </p>
  );
}
