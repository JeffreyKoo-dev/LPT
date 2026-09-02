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
  /** 카드에 쓰일 절대 URL 이미지. 카카오 스크랩 서버가 접근 가능해야 하므로
   * 반드시 https:// 절대경로여야 한다 (상대경로 불가). */
  imageUrl: string;
}

/**
 * 카카오톡 채팅방으로 카드를 공유한다.
 *
 * `objectType: "text"` + 본문(link)만 쓰는 방식은 카드 전체가 클릭되지 않는
 * 사례가 실제로 보고되어 있고(카카오 데브톡 문의 사례 확인, 이미지도 표시
 * 안 되는 경우가 있었음), 카카오 공식 예제들은 버튼이 있는 카드를 전부
 * `objectType: "feed"` + `content.imageUrl` + `buttons` 조합으로 구성한다.
 * 이 조합이 가장 널리 검증된 패턴이라 여기로 전환했다.
 */
export async function shareToKakao(params: KakaoShareParams): Promise<void> {
  await loadKakaoSdk();
  if (!window.Kakao) throw new Error("카카오 SDK를 불러오지 못했어요.");

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: params.title,
      description: params.description,
      imageUrl: params.imageUrl,
      link: { mobileWebUrl: params.url, webUrl: params.url },
    },
    buttons: [
      {
        title: "결과 보기",
        link: { mobileWebUrl: params.url, webUrl: params.url },
      },
    ],
  });
}
