import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { LptTypeId } from "@/types/lpt";
import { GrowthStats } from "@/types/growth";

export interface FriendInvite {
  inviteCode: string;
  shareUrl: string;
}

export interface Friend {
  userId: string;
  nickname: string;
  lptTypeId: LptTypeId | null;
  xp: number;
  stats: GrowthStats | null;
}

/** 로그인 상태가 아니면 예외를 던진다 (친구 기능은 항상 로그인이 전제됨) */
async function requireUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("로그인이 필요합니다.");
  return data.user.id;
}

/** 새 초대 링크를 만든다. 상대방이 로그인 상태로 이 링크를 열어 수락해야 친구가 된다. */
export async function createFriendInvite(): Promise<FriendInvite> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("friendships")
    .insert({ requester_id: userId })
    .select("invite_code")
    .single();

  if (error || !data) throw error ?? new Error("초대 링크 생성에 실패했습니다.");

  const inviteCode = data.invite_code as string;
  return {
    inviteCode,
    shareUrl: `${window.location.origin}/friends/accept/${inviteCode}`,
  };
}

export interface PendingInvite {
  requesterNickname: string;
  requesterTypeId: LptTypeId | null;
}

/** 초대 코드에 해당하는 요청 정보를 조회한다 (아직 수락 전) */
export async function getPendingInvite(inviteCode: string): Promise<PendingInvite | null> {
  const supabase = getSupabaseClient();
  const { data: invite } = await supabase
    .from("friendships")
    .select("requester_id, status, addressee_id")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (!invite || invite.status !== "pending" || invite.addressee_id) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("nickname, lpt_type_id")
    .eq("user_id", invite.requester_id)
    .maybeSingle();

  return {
    requesterNickname: profile?.nickname ?? "친구",
    requesterTypeId: (profile?.lpt_type_id as LptTypeId) ?? null,
  };
}

/** 초대를 수락해 친구 관계를 맺는다 */
export async function acceptFriendInvite(inviteCode: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const { error } = await supabase
    .from("friendships")
    .update({ addressee_id: userId, status: "accepted", accepted_at: new Date().toISOString() })
    .eq("invite_code", inviteCode);

  if (error) throw error;
}

/** 내 친구 목록(수락 완료된 관계만)을 가져온다 */
export async function getFriendsList(): Promise<Friend[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const { data: relations } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (!relations || relations.length === 0) return [];

  interface RelationRow {
    requester_id: string;
    addressee_id: string;
  }
  const friendIds = (relations as RelationRow[]).map((r) =>
    r.requester_id === userId ? r.addressee_id : r.requester_id
  );

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, nickname, lpt_type_id, xp, stats")
    .in("user_id", friendIds);

  interface ProfileRow {
    user_id: string;
    nickname: string;
    lpt_type_id: string | null;
    xp: number;
    stats: GrowthStats | null;
  }
  return ((profiles ?? []) as ProfileRow[]).map((p) => ({
    userId: p.user_id,
    nickname: p.nickname,
    lptTypeId: p.lpt_type_id as LptTypeId | null,
    xp: p.xp,
    stats: p.stats,
  }));
}
