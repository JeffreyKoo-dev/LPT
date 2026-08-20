import { StatKey } from "@/types/growth";

export type QuestCategory = "몰입" | "관계" | "루틴" | "체력";

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  focusStat: StatKey; // 완료 시 상승하는 대표 스탯
  xpReward: number;
  statReward: number;
  /** true면 모든 유형에게 추천, false면 focusStat이 캐릭터의 primaryStat과 맞을 때 우선 추천 */
  universal: boolean;
}
