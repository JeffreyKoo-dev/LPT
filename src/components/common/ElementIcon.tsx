import { Sprout, Flame, Mountain, Gem, Droplets, LucideIcon } from "lucide-react";
import { Element } from "@/types/saju";

export const ELEMENT_ICON_COMPONENT: Record<Element, LucideIcon> = {
  wood: Sprout,
  fire: Flame,
  earth: Mountain,
  metal: Gem,
  water: Droplets,
};

/** 오행별 대표 색상 — 전통 오방색(청·적·황·백·흑)을 다크 UI 톤으로 조정한 값 */
export const ELEMENT_HEX: Record<Element, string> = {
  wood: "#6f8f6a", // 청(靑) — 옥빛에 가까운 톤다운 녹색
  fire: "#b8543c", // 적(赤) — 단청 주칠에 가까운 붉은빛
  earth: "#c99a4a", // 황(黃) — 토황색
  metal: "#c9c0a8", // 백(白) — 차가운 회색 대신 따뜻한 아이보리
  water: "#4d6a87", // 흑(黑) — 먹빛에 가까운 짙은 남색
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
