"use client";

/**
 * 카카오톡 공유하기(Kakao Share SDK) 연동.
 *
 * 카카오 로그인과는 별개의 기능이라 Kakao Developers에서 별도로 켜야 한다:
 *   1. Kakao Developers → 내 애플리케이션 → 해당 앱 선택
 *   2. 제품 설정 → 카카오톡 공유 → 활성화 ON
 *   3. 앱 설정 → 앱 키 → JavaScript 키 복사
 *   4. 앱 설정 → 플랫폼 → Web 플랫폼 등록에 실제 서비스 도메인 추가
 *      (예: https://questofme.com)
 *   5. .env.local에 NEXT_PUBLIC_KAKAO_JS_KEY=발급받은_JavaScript_키 추가
 *
 * 환경변수가 없으면 카카오톡 공유 버튼 자체가 노출되지 않는다.
 *
 * SDK 버전은 https://developers.kakao.com/docs/ko/javascript/download 의
 * "최신 버전" 표를 참고해 정기적으로 확인·업데이트하는 것을 권장한다
 * (2026-08 기준 최신: 2.8.2). integrity(SRI) 속성은 다운로드 페이지에서
 * 해당 버전의 정확한 해시값을 복사해 추가하면 보안을 더 강화할 수 있다
 * (선택 사항이며, 잘못된 값을 넣으면 스크립트 로딩 자체가 실패하니 주의).
 */

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
      };
    };
  }
}

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js";

let sdkLoadPromise: Promise<void> | null = null;

export function isKakaoShareConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
}

function loadKakaoSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Kakao?.isInitialized()) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${KAKAO_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.onload = () => {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (window.Kakao && key && !window.Kakao.isInitialized()) {
        window.Kakao.init(key);
      }
      resolve();
    };
    script.onerror = () => reject(new Error("카카오 SDK 로드 실패"));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

export interface KakaoShareParams {
  title: string;
  description: string;
  url: string;
}

/** 카카오톡 채팅방으로 텍스트 카드를 공유한다 (이미지 없이도 되는 텍스트형 템플릿) */
export async function shareToKakao(params: KakaoShareParams): Promise<void> {
  await loadKakaoSdk();
  if (!window.Kakao) throw new Error("카카오 SDK를 불러오지 못했어요.");

  window.Kakao.Share.sendDefault({
    objectType: "text",
    text: `${params.title}\n${params.description}`,
    link: { mobileWebUrl: params.url, webUrl: params.url },
  });
}
