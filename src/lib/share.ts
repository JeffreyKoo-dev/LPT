import { LptTypeMeta, FantasyClassMeta } from "@/types/lpt";
import { BadgeMeta } from "@/types/badge";
import { Element } from "@/types/saju";
import { Gender } from "@/types/user";

export type ShareKind = "character" | "level" | "badge";

export type ShareCardIcon =
  | { kind: "element"; element: Element }
  | { kind: "level" }
  | { kind: "badge" };

/**
 * 공유 카드에 노출할 데이터만 골라 담는다.
 * 표현 원칙: 생년월일, 출생시간, 성별, 설문 상세 응답은 절대 포함하지 않는다.
 * (illustrationSlug는 성별을 그대로 노출하는 게 아니라, 캐릭터 일러스트
 * 파일명만 가리키는 값이라 원칙에 위배되지 않는다.)
 */
export interface ShareCardData {
  kind: ShareKind;
  heading: string;
  subheading: string;
  badge: string; // 카드 상단 작은 라벨
  nickname: string;
  icon: ShareCardIcon;
  illustrationSlug?: string; // "character" 카드에서만 사용
}

export function buildCharacterShareData(
  nickname: string,
  typeMeta: LptTypeMeta,
  fantasyClass: FantasyClassMeta,
  gender: Gender
): ShareCardData {
  return {
    kind: "character",
    heading: typeMeta.name,
    subheading: typeMeta.tagline,
    badge: fantasyClass.className,
    nickname,
    icon: { kind: "element", element: fantasyClass.accentElement },
    illustrationSlug: `${typeMeta.id.toLowerCase().replace(/_/g, "-")}-${gender}`,
  };
}

export function buildLevelShareData(nickname: string, level: number): ShareCardData {
  return {
    kind: "level",
    heading: `Lv.${level} 달성`,
    subheading: "꾸준한 성장 퀘스트로 여기까지 왔어요.",
    badge: "레벨업",
    nickname,
    icon: { kind: "level" },
  };
}

export function buildBadgeShareData(nickname: string, badgeMeta: BadgeMeta): ShareCardData {
  return {
    kind: "badge",
    heading: badgeMeta.name,
    subheading: badgeMeta.description,
    badge: "뱃지 획득",
    nickname,
    icon: { kind: "badge" },
  };
}

/**
 * /share/[id] 라우트 파라미터를 해석한다.
 *   - "character"        → 캐릭터 카드
 *   - "level-{n}"         → 레벨 n 달성 카드
 *   - "badge-{badgeId}"   → 뱃지 카드
 */
export type ShareParam =
  | { kind: "character" }
  | { kind: "level"; level: number }
  | { kind: "badge"; badgeId: string }
  | { kind: "unknown" };

export function parseShareId(id: string): ShareParam {
  if (id === "character") return { kind: "character" };
  if (id.startsWith("level-")) {
    const level = Number(id.replace("level-", ""));
    if (!Number.isNaN(level)) return { kind: "level", level };
  }
  if (id.startsWith("badge-")) {
    return { kind: "badge", badgeId: id.replace("badge-", "") };
  }
  return { kind: "unknown" };
}
