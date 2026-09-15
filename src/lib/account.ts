import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { BasicInfo } from "@/types/user";

/**
 * 닉네임을 변경한다. 로그인 상태면 클라우드(user_profiles)와 로컬 둘 다
 * 갱신하고, 로그인 안 된 상태면 로컬만 갱신한다. 새 닉네임도 기존
 * 회원가입 때와 동일한 검수(로컬 키워드 + AI)를 거쳐야 한다 — 호출부
 * (/account 페이지)에서 checkNicknameLocally/checkContentWithAi를 먼저
 * 통과시킨 뒤에 이 함수를 호출한다.
 */
export async function updateNickname(newNickname: string): Promise<void> {
  const trimmed = newNickname.trim();
  if (!trimmed) throw new Error("닉네임을 입력해주세요.");

  const basicInfo = getStorage().get<BasicInfo>(STORAGE_KEYS.basicInfo);
  if (basicInfo) {
    getStorage().set(STORAGE_KEYS.basicInfo, { ...basicInfo, nickname: trimmed });
  }

  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error } = await supabase
    .from("user_profiles")
    .update({ nickname: trimmed })
    .eq("user_id", userData.user.id);
  if (error) throw error;
}

/**
 * 본인 데이터를 JSON으로 내보낸다. 로컬에 있는 것(사주 분석, 성장 기록)과
 * 클라우드에 동기화된 것(닉네임, 유형, 보유 자산 등)을 합친다. 생년월일시
 * 원본은 애초에 서버에 저장하지 않으므로, 로컬에 남아있는 경우에만 포함된다
 * (사용자 본인 기기의 데이터이므로 본인에게 보여주는 건 문제없음).
 */
export async function exportMyData(): Promise<Record<string, unknown>> {
  const local = {
    basicInfo: getStorage().get(STORAGE_KEYS.basicInfo),
    analysisReport: getStorage().get(STORAGE_KEYS.analysis),
    growthProfile: getStorage().get(STORAGE_KEYS.growthProfile),
  };

  if (!isSupabaseConfigured()) return { local };

  try {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { local };

    const [{ data: profile }, { data: survey }, { data: wallet }] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", userData.user.id).maybeSingle(),
      supabase.from("survey_responses").select("*").eq("user_id", userData.user.id).maybeSingle(),
      supabase.from("wallets").select("cash_balance").eq("user_id", userData.user.id).maybeSingle(),
    ]);

    return {
      local,
      cloud: { profile, survey, wallet },
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[account] 데이터 내보내기 중 클라우드 조회 실패", error);
    return { local };
  }
}

/** 본인 계정을 탈퇴한다. 성공하면 로컬 데이터도 모두 지운다. */
export async function deleteMyAccount(): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("이 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("로그인이 필요합니다.");

  const res = await fetch("/api/account/delete", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "탈퇴 처리에 실패했어요.");

  getStorage().clearAll();
}
