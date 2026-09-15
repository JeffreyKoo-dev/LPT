import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface MilestoneDefinition {
  id: number;
  metric_type: string;
  threshold: number;
  reward_cash: number;
  title: string;
  description: string | null;
  sort_order: number;
}

export interface MilestoneProgress {
  metricType: string;
  currentValue: number;
}

/** 전체 미션 정의(단계별 목표·보상)를 조회한다. */
export async function getMilestoneDefinitions(): Promise<MilestoneDefinition[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("milestone_definitions")
      .select("*")
      .eq("is_active", true)
      .order("metric_type", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as MilestoneDefinition[];
  } catch (error) {
    console.error("[milestones] 미션 목록 조회 실패", error);
    return [];
  }
}

/** 로그인한 본인의 지표별 진행도(예: 초대한 친구 수)를 조회한다. */
export async function getMyProgress(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("get_my_milestone_progress");
    if (error) throw error;
    const result: Record<string, number> = {};
    for (const row of data ?? []) {
      result[row.metric_type] = row.current_value;
    }
    return result;
  } catch (error) {
    console.error("[milestones] 진행도 조회 실패", error);
    return {};
  }
}

/** 이미 수령한 마일스톤 id 목록을 조회한다. */
export async function getClaimedMilestoneIds(): Promise<Set<number>> {
  if (!isSupabaseConfigured()) return new Set();

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("user_milestone_claims").select("milestone_id");
    if (error) throw error;
    return new Set((data ?? []).map((row: { milestone_id: number }) => row.milestone_id));
  } catch (error) {
    console.error("[milestones] 수령 내역 조회 실패", error);
    return new Set();
  }
}

/** 보상을 수령한다. 서버가 달성 여부·중복 수령 여부를 다시 확인한다. */
export async function claimMilestoneReward(
  milestoneId: number
): Promise<{ newBalance: number; rewardCash: number }> {
  if (!isSupabaseConfigured()) throw new Error("이 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("claim_milestone_reward", {
    p_milestone_id: milestoneId,
  });
  if (error) throw new Error(error.message);

  const row = data?.[0];
  return { newBalance: row?.new_balance ?? 0, rewardCash: row?.reward_cash ?? 0 };
}
