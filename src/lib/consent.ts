import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { WITHDRAWAL_NOTICE_VERSION } from "@/data/refundPolicy";

/**
 * 청약철회 제한 고지를 확인한 사실을 서버(digital_content_consents)에 남긴다.
 * 기록 실패가 결제·생성을 막으면 안 되므로 모든 함수는 실패해도 예외를 던지지 않는다.
 * (마이그레이션 035가 아직 적용되지 않은 환경에서도 앱은 그대로 동작한다.)
 */
export async function recordConsent(productCode: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await getSupabaseClient().rpc("record_digital_content_consent", {
      p_product_code: productCode,
      p_notice_version: WITHDRAWAL_NOTICE_VERSION,
    });
    if (error) throw error;
    return typeof data === "string" ? data : null;
  } catch (err) {
    console.warn("[consent] 동의 기록 실패", err);
    return null;
  }
}

/** 콘텐츠 생성의 요청·완료·실패 시각을 동의 기록에 이어 붙인다. */
export async function markGeneration(
  consentId: string | null,
  status: "requested" | "completed" | "failed"
): Promise<void> {
  if (!consentId || !isSupabaseConfigured()) return;
  try {
    const { error } = await getSupabaseClient().rpc("mark_digital_content_generation", {
      p_consent_id: consentId,
      p_status: status,
    });
    if (error) throw error;
  } catch (err) {
    console.warn("[consent] 생성 이력 기록 실패", err);
  }
}
