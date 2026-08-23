import { Sprout, Flame, Mountain, Gem, Droplets, LucideIcon } from "lucide-react";
import { Element } from "@/types/saju";

export const ELEMENT_ICON_COMPONENT: Record<Element, LucideIcon> = {
  wood: Sprout,
  fire: Flame,
  earth: Mountain,
  metal: Gem,
  water: Droplets,
};

/** 오행별 대표 색상 (Tailwind 유틸리티와 인라인 스타일 양쪽에서 함께 쓰기 위한 원시 값) */
export const ELEMENT_HEX: Record<Element, string> = {
  wood: "#34d399",
  fire: "#fb7185",
  earth: "#fbbf24",
  metal: "#cbd5e1",
  water: "#38bdf8",
};

interface ElementIconProps {
  element: Element;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

/** 오행(목화토금수)을 한눈에 알아볼 수 있게 하는 공용 아이콘 */
export function ElementIcon({ element, size = 20, strokeWidth = 1.75, color, className }: ElementIconProps) {
  const Icon = ELEMENT_ICON_COMPONENT[element];
  return <Icon size={size} strokeWidth={strokeWidth} color={color} className={className} />;
}
