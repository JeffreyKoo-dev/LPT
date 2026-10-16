import { cn } from "@/lib/utils";

/**
 * 쿠팡 파트너스 대가성 문구. 쿠팡 파트너스 활동 시 제휴 링크가 노출되는 곳에
 * 반드시 함께 표시해야 한다(공정거래위원회 심사지침: 추천·보증인과 사업자의
 * 경제적 이해관계 공개). 문구는 쿠팡이 안내한 표현 그대로 유지할 것.
 */
export const COUPANG_DISCLOSURE_TEXT =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

interface CoupangDisclosureProps {
  className?: string;
}

export function CoupangDisclosure({ className }: CoupangDisclosureProps) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted", className)}>
      {COUPANG_DISCLOSURE_TEXT}
    </p>
  );
}
