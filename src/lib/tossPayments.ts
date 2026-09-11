"use client";

/**
 * 토스페이먼츠 SDK v2(주문서형) 로더 + 결제 위젯 헬퍼.
 *
 * v2에서는 결제수단을 코드로 바로 선택할 수 없고, 실제로 화면에
 * "결제수단 선택 UI"(renderPaymentMethods)와 "약관 동의 UI"
 * (renderAgreement)를 렌더링해서 사용자가 직접 골라야 한다. 이 두
 * 렌더링이 끝난 뒤에만 requestPayment()가 정상 동작한다 — 이 순서를
 * 빠뜨리면 "결제수단이 선택되지 않았어요" 에러가 난다(실제로 겪은 문제).
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
  renderPaymentMethods: (params: { selector: string; variantKey?: string }) => Promise<unknown>;
  renderAgreement: (params: { selector: string; variantKey?: string }) => Promise<unknown>;
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
const PAYMENT_METHOD_SELECTOR = "#toss-payment-method";
const AGREEMENT_SELECTOR = "#toss-agreement";

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

/**
 * 결제 위젯을 초기화하고, 결제수단 선택 UI + 약관 동의 UI를 화면에
 * 렌더링한다. 호출 전에 반드시 #toss-payment-method, #toss-agreement
 * id를 가진 요소가 DOM에 있어야 한다.
 */
export async function initChargeWidgets(params: {
  customerKey: string;
  amount: number;
}): Promise<TossWidgets> {
  if (!isTossPaymentsConfigured()) {
    throw new Error("결제 기능이 아직 설정되지 않았습니다.");
  }

  await loadTossSdk();
  if (!window.TossPayments) throw new Error("토스페이먼츠 SDK를 불러오지 못했어요.");

  const tossPayments = window.TossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
  const widgets = tossPayments.widgets({ customerKey: params.customerKey });

  await widgets.setAmount({ value: params.amount, currency: "KRW" });
  await Promise.all([
    widgets.renderPaymentMethods({ selector: PAYMENT_METHOD_SELECTOR, variantKey: "DEFAULT" }),
    widgets.renderAgreement({ selector: AGREEMENT_SELECTOR, variantKey: "AGREEMENT" }),
  ]);

  return widgets;
}

export { PAYMENT_METHOD_SELECTOR, AGREEMENT_SELECTOR };
export type { TossWidgets };
