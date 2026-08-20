import { GrowthProfile } from "@/types/growth";

export interface BadgeMeta {
  id: string;
  name: string;
  description: string;
  /** 프로필 상태를 보고 획득 조건 충족 여부를 판단한다 (LocalStorage에는 저장되지 않는 순수 함수) */
  condition: (profile: GrowthProfile) => boolean;
}
