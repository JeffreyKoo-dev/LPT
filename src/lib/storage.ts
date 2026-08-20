/**
 * 저장소 추상화 레이어.
 *
 * MVP 1차는 LocalStorage로 구현하되, 이후 Supabase/Prisma DB로 전환할 때
 * 이 파일의 구현부만 교체하면 되도록 인터페이스를 분리했다.
 * 다른 모듈(lib/survey.ts, lib/growth.ts 등)은 항상 이 파일의 함수를 통해서만
 * 데이터를 읽고 쓴다.
 */

export const STORAGE_KEYS = {
  basicInfo: "lpt:basicInfo",
  survey: "lpt:survey",
  analysis: "lpt:analysis", // Sprint 2에서 사용 (사주/설문 계산 결과)
  growthProfile: "lpt:growthProfile", // Sprint 4에서 사용 (XP/레벨/스탯)
  quests: "lpt:quests", // Sprint 4에서 사용
  badges: "lpt:badges", // Sprint 4에서 사용
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function isBrowser() {
  return typeof window !== "undefined";
}

export interface LptStorage {
  get<T>(key: StorageKey): T | null;
  set<T>(key: StorageKey, value: T): void;
  remove(key: StorageKey): void;
  clearAll(): void;
}

/**
 * LocalStorage 기반 구현체.
 * 추후 Supabase 전환 시 이 클래스와 동일한 시그니처의 SupabaseStorage를
 * 구현해 getStorage()의 반환값만 바꿔주면 상위 로직은 수정할 필요가 없다.
 */
class LocalStorageAdapter implements LptStorage {
  get<T>(key: StorageKey): T | null {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[storage] "${key}" 읽기 실패`, error);
      return null;
    }
  }

  set<T>(key: StorageKey, value: T): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[storage] "${key}" 저장 실패`, error);
    }
  }

  remove(key: StorageKey): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(key);
  }

  clearAll(): void {
    if (!isBrowser()) return;
    Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
  }
}

let instance: LptStorage | null = null;

export function getStorage(): LptStorage {
  if (!instance) {
    instance = new LocalStorageAdapter();
  }
  return instance;
}
