import { Element } from "@/types/saju";

/**
 * "오늘의 추천 아이템"에 쓰이는 오행별 상품 큐레이션.
 *
 * MVP 단계라 실제 제휴 링크(쿠팡파트너스 등)는 아직 연결하지 않았다.
 * `affiliateUrl`을 비워두면 UI에서 자동으로 "둘러보기 준비 중" 상태로 표시되고,
 * 실제 제휴 계정이 준비되면 이 값만 채워 넣으면 바로 노출된다 (코드 변경 불필요).
 */
export interface ShoppingItem {
  id: string;
  element: Element;
  name: string;
  blurb: string;
  affiliateUrl?: string;
}

export const SHOPPING_ITEMS: ShoppingItem[] = [
  { id: "wood-1", element: "wood", name: "그린 아로마 디퓨저", blurb: "산뜻한 향으로 하루를 여는 데 도움이 될 수 있어요." },
  { id: "wood-2", element: "wood", name: "식물 재배 키트", blurb: "책상 위 작은 초록빛이 기분 전환에 좋을 수 있어요." },
  { id: "fire-1", element: "fire", name: "레드 무드등", blurb: "따뜻한 조명이 활력을 더해줄 수 있어요." },
  { id: "fire-2", element: "fire", name: "핸드드립 커피 세트", blurb: "직접 내리는 커피 한 잔이 오늘 기운과 잘 맞을 수 있어요." },
  { id: "earth-1", element: "earth", name: "도자기 머그컵", blurb: "묵직하고 편안한 질감이 안정감을 줄 수 있어요." },
  { id: "earth-2", element: "earth", name: "우드 트레이", blurb: "책상 위를 정돈하면 마음도 정리되는 느낌일 수 있어요." },
  { id: "metal-1", element: "metal", name: "스테인리스 텀블러", blurb: "깔끔하고 단정한 도구가 오늘과 잘 어울려요." },
  { id: "metal-2", element: "metal", name: "미니멀 무선 이어폰", blurb: "군더더기 없는 디자인이 기분 전환에 좋을 수 있어요." },
  { id: "water-1", element: "water", name: "수분 미스트", blurb: "촉촉한 케어가 오늘 컨디션에 도움이 될 수 있어요." },
  { id: "water-2", element: "water", name: "블루 라이트 무드등", blurb: "차분한 파란빛이 마음을 가라앉히는 데 좋을 수 있어요." },
];

export function getShoppingItemsByElement(element: Element): ShoppingItem[] {
  return SHOPPING_ITEMS.filter((item) => item.element === element);
}
