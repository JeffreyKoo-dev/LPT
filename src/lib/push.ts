// src/lib/push.ts
// 웹 푸시 구독/해지 클라이언트 헬퍼. VAPID 공개키는 NEXT_PUBLIC_VAPID_PUBLIC_KEY로
// 설정하며, 비어있으면 isPushConfigured()가 false를 반환해 UI에서 버튼 자체를 숨긴다
// (카카오 공유/리워드 광고와 동일한 "미설정 시 자동 숨김" 패턴).

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isPushConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

/** 현재 브라우저가 이미 구독 중인지 확인한다(서버 조회 없이 브라우저 상태만 본다). */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/** 알림 권한을 요청하고, 서비스워커를 등록한 뒤 구독을 생성해 서버에 저장한다. */
export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "이 브라우저는 푸시 알림을 지원하지 않아요." };
  if (!isPushConfigured()) return { ok: false, error: "푸시 알림이 아직 설정되지 않았어요." };
  if (!isSupabaseConfigured()) return { ok: false, error: "로그인이 필요해요." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "알림 권한이 거부됐어요. 브라우저 설정에서 다시 허용할 수 있어요." };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
  });

  const json = subscription.toJSON();
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "로그인이 필요해요." };

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      authKey: json.keys?.auth,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: "구독 저장에 실패했어요. 잠시 후 다시 시도해주세요." };
  }

  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "로그인이 필요해요." };

  const existing = await getExistingSubscription();
  const endpoint = existing?.endpoint;

  if (existing) {
    await existing.unsubscribe();
  }

  if (endpoint) {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ endpoint }),
      });
    }
  }

  return { ok: true };
}

/** VAPID 공개키(base64url)를 PushManager.subscribe가 요구하는 Uint8Array 형식으로 변환한다. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
