// src/lib/ads/gpt.ts
// Google Publisher Tag(GPT) 스크립트를 1회만 로드하고 준비 완료를 기다리는 헬퍼.
// 웹(questofme.com)에서 리워드 광고를 띄우기 위한 기반 로더.

/**
 * googletag는 공식 npm 타입 패키지가 없어, 실제로 쓰는 부분만 최소한으로
 * 직접 선언한다 (전체 GPT API 표면을 다 타이핑하지 않는다).
 */
export interface GoogletagRewardedSlot {
  addService: (service: unknown) => void;
}

export interface GoogletagEvent {
  makeRewardedVisible: () => void;
}

export interface Googletag {
  cmd: Array<() => void>;
  enums: { OutOfPageFormat: { REWARDED: unknown } };
  defineOutOfPageSlot: (adUnitPath: string, format: unknown) => GoogletagRewardedSlot | null;
  pubads: () => {
    addEventListener: (event: string, handler: (event: GoogletagEvent) => void) => void;
  };
  enableServices: () => void;
  display: (slot: GoogletagRewardedSlot) => void;
  destroySlots: (slots: GoogletagRewardedSlot[]) => void;
}

declare global {
  interface Window {
    googletag: Googletag;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadGpt(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GPT는 브라우저 환경에서만 로드할 수 있습니다"));
  }

  if (loadPromise) return loadPromise;

  window.googletag = window.googletag || ({ cmd: [] } as unknown as Googletag);

  loadPromise = new Promise((resolve, reject) => {
    if (document.querySelector('script[data-gpt-loader="true"]')) {
      window.googletag.cmd.push(() => resolve());
      return;
    }

    const script = document.createElement("script");
    script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    script.async = true;
    script.dataset.gptLoader = "true";
    script.onload = () => {
      window.googletag.cmd.push(() => resolve());
    };
    script.onerror = () => reject(new Error("GPT 스크립트 로드 실패"));

    document.head.appendChild(script);
  });

  return loadPromise;
}
