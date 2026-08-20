import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind 클래스 병합 헬퍼.
 * 조건부 클래스와 충돌하는 유틸리티 클래스를 안전하게 합친다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
