// src/app/api/cron/monthly-reminder/route.ts
//
// "이번 달 운세" 재구매 리마인더를 웹 푸시로 보낸다. 대시보드 인앱 카드
// (MonthlyFortuneReminder)와 같은 조건(이번 달에 monthly_fortune을 결제한
// 적 없는 유저)을 쓰되, 푸시는 "들어와야 보이는" 인앱 카드와 달리 먼저
// 다가갈 수 있다는 점이 다르다.
//
// EC2 시스템 크론으로 하루 한 번 호출하는 걸 전제로 한다 (예시):
//   0 10 * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" \
//     https://questofme.com/api/cron/monthly-reminder
//
// CRON_SECRET이 설정 안 돼 있으면 이 라우트는 항상 403을 반환해, 실수로
// 공개 엔드포인트가 열려버리는 걸 막는다.

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

const REMINDER_TYPE = "monthly_fortune";

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("Authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    return NextResponse.json({ error: "웹 푸시(VAPID)가 설정되지 않았습니다." }, { status: 500 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const admin = getSupabaseAdmin();
  const since = startOfMonthIso();

  const [{ data: subs, error: subsError }, { data: purchasedTx, error: purchaseError }, { data: reminded, error: remindedError }] =
    await Promise.all([
      admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth_key"),
      admin
        .from("wallet_transactions")
        .select("user_id")
        .eq("product_code", REMINDER_TYPE)
        .eq("type", "spend")
        .gte("created_at", since),
      admin
        .from("push_reminder_log")
        .select("user_id")
        .eq("reminder_type", REMINDER_TYPE)
        .gte("sent_at", since),
    ]);

  if (subsError || purchaseError || remindedError) {
    console.error("[cron/monthly-reminder] 조회 실패", subsError, purchaseError, remindedError);
    return NextResponse.json({ error: "대상 조회에 실패했습니다." }, { status: 500 });
  }

  const purchasedUserIds = new Set((purchasedTx ?? []).map((r) => r.user_id));
  const remindedUserIds = new Set((reminded ?? []).map((r) => r.user_id));

  const eligibleSubs = (subs ?? []).filter(
    (s) => !purchasedUserIds.has(s.user_id) && !remindedUserIds.has(s.user_id)
  );

  const payload = JSON.stringify({
    title: "이번 달 운세, 아직 안 보셨네요",
    body: "매달 새로 바뀌는 흐름이라, 지난달과는 또 다른 이야기가 기다리고 있을 수 있어요.",
    url: "/result",
  });

  let sent = 0;
  let removed = 0;
  const sentUserIds = new Set<string>();

  for (const sub of eligibleSubs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payload
      );
      sent += 1;
      sentUserIds.add(sub.user_id);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      // 410 Gone / 404 Not Found: 브라우저에서 구독이 이미 해지된 경우 — 정리한다.
      if (statusCode === 410 || statusCode === 404) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
        removed += 1;
      } else {
        console.error("[cron/monthly-reminder] 발송 실패", sub.id, err);
      }
    }
  }

  if (sentUserIds.size > 0) {
    await admin
      .from("push_reminder_log")
      .insert([...sentUserIds].map((user_id) => ({ user_id, reminder_type: REMINDER_TYPE })));
  }

  return NextResponse.json({
    ok: true,
    eligible: eligibleSubs.length,
    sent,
    uniqueUsersSent: sentUserIds.size,
    removedExpiredSubscriptions: removed,
  });
}
