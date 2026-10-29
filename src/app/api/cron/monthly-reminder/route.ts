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
// 신년운세 캠페인은 같은 주소에 ?campaign=<id>를 붙여 호출한다(src/lib/pushCampaigns.ts):
//   newyear_open (12/1~7), newyear_prep (12/28~31), newyear_day (1/1~3)
// 허용 날짜 밖에서 호출하면 아무것도 보내지 않고 skipped를 돌려준다.
//
// CRON_SECRET이 설정 안 돼 있으면 이 라우트는 항상 403을 반환해, 실수로
// 공개 엔드포인트가 열려버리는 걸 막는다.

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getPushCampaign, isPushCampaignId, PushCampaignId } from "@/lib/pushCampaigns";

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
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

  // ?campaign 이 없으면 기존 "이번 달 운세" 리마인더(하위 호환)
  const campaignParam = req.nextUrl.searchParams.get("campaign") ?? "monthly_fortune";
  if (!isPushCampaignId(campaignParam)) {
    return NextResponse.json({ error: "알 수 없는 캠페인입니다." }, { status: 400 });
  }
  const campaign = getPushCampaign(campaignParam as PushCampaignId);
  if (!campaign) {
    // 허용 날짜(KST) 밖이면 보내지 않는다 — 크론 설정 실수로 엉뚱한 날 발송되는 걸 막는다.
    return NextResponse.json({ ok: true, skipped: "outside_campaign_window", campaign: campaignParam });
  }

  const admin = getSupabaseAdmin();

  let purchaseQuery = admin
    .from("wallet_transactions")
    .select("user_id")
    .eq("product_code", campaign.productCode)
    .eq("type", "spend")
    .gte("created_at", campaign.purchasedSince.toISOString());
  if (campaign.purchasedBefore) purchaseQuery = purchaseQuery.lt("created_at", campaign.purchasedBefore.toISOString());

  let remindedQuery = admin.from("push_reminder_log").select("user_id").eq("reminder_type", campaign.logType);
  if (campaign.dedupeSince) remindedQuery = remindedQuery.gte("sent_at", campaign.dedupeSince.toISOString());

  const [{ data: subs, error: subsError }, { data: purchasedTx, error: purchaseError }, { data: reminded, error: remindedError }] =
    await Promise.all([
      admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth_key"),
      purchaseQuery,
      remindedQuery,
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

  const payload = JSON.stringify(campaign.payload);

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
      .insert([...sentUserIds].map((user_id) => ({ user_id, reminder_type: campaign.logType })));
  }

  return NextResponse.json({
    ok: true,
    campaign: campaign.id,
    eligible: eligibleSubs.length,
    sent,
    uniqueUsersSent: sentUserIds.size,
    removedExpiredSubscriptions: removed,
  });
}
