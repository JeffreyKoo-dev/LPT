import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";

/**
 * 각 외부 연동의 "설정 여부"만 알려준다 — 실제 키 값은 절대 반환하지 않는다.
 * 매번 .env.local을 SSH로 열어보지 않고도 한눈에 뭐가 켜져 있는지 확인하기 위함.
 */
export async function GET(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  return NextResponse.json({
    items: [
      { name: "쿠팡파트너스", configured: !!(process.env.COUPANG_ACCESS_KEY && process.env.COUPANG_SECRET_KEY) },
      { name: "토스페이먼츠", configured: !!(process.env.TOSS_SECRET_KEY && process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY) },
      {
        name: "토스페이먼츠(테스트 키 사용 중)",
        configured: process.env.TOSS_SECRET_KEY?.startsWith("test_") ?? false,
      },
      { name: "Google Ad Manager 리워드 광고", configured: !!process.env.NEXT_PUBLIC_GAM_REWARDED_AD_UNIT },
      { name: "카카오톡 공유", configured: !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY },
    ],
  });
}
