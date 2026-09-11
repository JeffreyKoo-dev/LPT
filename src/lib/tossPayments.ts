"use client";

/**
 * 토스페이먼츠 SDK v2(결제창형) 로더 + 결제 요청 헬퍼.
 *
 * NEXT_PUBLIC_TOSS_CLIENT_KEY가 없으면(가입 전) isTossPaymentsConfigured()가
 * false를 반환하고, 충전 화면은 "준비 중" 상태로 자연스럽게 대체된다.
 */

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

interface TossWidgets {
  setAmount: (amount: { value: number; currency: "KRW" }) => Promise<void>;
  requestPayment: (params: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }) => Promise<void>;
}

interface TossPaymentsInstance {
  widgets: (params: { customerKey: string }) => TossWidgets;
}

const SDK_URL = "https://js.tosspayments.com/v2/standard";

let sdkLoadPromise: Promise<void> | null = null;

export function isTossPaymentsConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
}

function loadTossSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TossPayments) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("토스페이먼츠 SDK 로드 실패"));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

export interface StartChargeParams {
  orderId: string;
  amount: number;
  orderName: string;
  customerKey: string;
  customerEmail?: string;
  customerName?: string;
}

/**
 * 결제창을 띄운다(Redirect 방식) — 성공 시 successUrl로, 실패/취소 시
 * failUrl로 브라우저가 이동한다. 이 함수 자체는 페이지 이동이 일어나므로
 * 반환값을 기다릴 필요가 없다.
 */
export async function startCharge(params: StartChargeParams): Promise<void> {
  if (!isTossPaymentsConfigured()) {
    throw new Error("결제 기능이 아직 설정되지 않았습니다.");
  }

  await loadTossSdk();
  if (!window.TossPayments) throw new Error("토스페이먼츠 SDK를 불러오지 못했어요.");

  const tossPayments = window.TossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
  const widgets = tossPayments.widgets({ customerKey: params.customerKey });

  await widgets.setAmount({ value: params.amount, currency: "KRW" });
  await widgets.requestPayment({
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl: `${window.location.origin}/charge/success`,
    failUrl: `${window.location.origin}/charge/fail`,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
  });
}
