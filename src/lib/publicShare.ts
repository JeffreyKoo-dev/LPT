import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ShareCardData } from "@/lib/share";
import { Element } from "@/types/saju";

/**
 * 사용자가 "받는 사람도 결과 보기 허용"에 동의한 경우에만 호출된다.
 * 공유 카드 요약 정보를 Supabase(shared_profiles)에 저장해, 링크를 받은
 * 사람이 자기 기기에 아무 데이터가 없어도 그 자리에서 결과를 볼 수 있게 한다.
 * 생년월일·출생시간·성별 원본은 여기서도 전혀 다루지 않는다.
 */
export async function publishSharedProfile(data: ShareCardData): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const id = generateShareId();

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("shared_profiles").insert({
      id,
      kind: data.kind,
      nickname: data.nickname,
      heading: data.heading,
      subheading: data.subheading,
      badge_label: data.badge,
      illustration_slug: data.illustrationSlug ?? null,
      icon_element: data.icon.kind === "element" ? data.icon.element : null,
    });
    if (error) throw error;
    return id;
  } catch (error) {
    console.error("[publicShare] 공개 공유 생성 실패", error);
    return null;
  }
}

interface SharedProfileRow {
  kind: ShareCardData["kind"];
  nickname: string;
  heading: string;
  subheading: string;
  badge_label: string;
  illustration_slug: string | null;
  icon_element: string | null;
}

/** 공개 공유 ID로 카드 데이터를 조회한다. 없거나 실패하면 null. */
export async function fetchSharedProfile(id: string): Promise<ShareCardData | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("shared_profiles")
      .select("kind, nickname, heading, subheading, badge_label, illustration_slug, icon_element")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as SharedProfileRow;

    return {
      kind: row.kind,
      nickname: row.nickname,
      heading: row.heading,
      subheading: row.subheading,
      badge: row.badge_label,
      illustrationSlug: row.illustration_slug ?? undefined,
      icon: row.icon_element
        ? { kind: "element" as const, element: row.icon_element as Element }
        : row.kind === "level"
          ? { kind: "level" as const }
          : { kind: "badge" as const },
    };
  } catch (error) {
    console.error("[publicShare] 공개 공유 조회 실패", error);
    return null;
  }
}

function generateShareId(): string {
  // URL에 노출되는 짧고 안전한 랜덤 ID (충돌 가능성은 사실상 무시할 수준)
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}
