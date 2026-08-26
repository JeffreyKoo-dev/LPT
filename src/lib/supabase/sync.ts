import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { GrowthProfile } from "@/types/growth";
import { SurveyState } from "@/types/survey";
import { BasicInfo } from "@/types/user";
import { LptTypeId } from "@/types/lpt";

/**
 * 로그인한 사용자의 데이터를 Supabase와 동기화한다.
 * LocalStorage가 항상 우선(빠르고 오프라인에서도 동작)이며, 로그인 상태일 때만
 * 백그라운드로 클라우드에도 반영한다. 생년월일시·성별 등 원본 개인정보는 여기서
 * 전혀 다루지 않는다 (계산 "결과"만 동기화 — docs/PHASE2_ROADMAP.md 3절 참고).
 */

interface UserProfileRow {
  user_id: string;
  nickname: string;
  lpt_type_id: string | null;
  xp: number;
  stats: GrowthProfile["stats"];
  badges: string[];
  quest_log: GrowthProfile["questLog"];
  created_at: string;
  updated_at: string;
}

interface SurveyResponseRow {
  user_id: string;
  answers: SurveyState["answers"];
  computed_at: string;
}

function getLocalNickname(): string {
  return getStorage().get<BasicInfo>(STORAGE_KEYS.basicInfo)?.nickname ?? "";
}

/** 로그인 상태가 아니면 아무 것도 하지 않고 조용히 반환한다 (일반 사용자 흐름에 영향 없음) */
export async function pushGrowthProfileToCloud(profile: GrowthProfile): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getSupabaseClient();
    // 캐싱된 값 대신 매번 실제 세션을 확인한다 — 캐시는 비동기로 채워지는 값이라
    // 페이지 로드 직후 첫 호출 시 아직 채워지기 전이면 로그인 상태를 놓칠 수 있다.
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;

    await supabase.from("user_profiles").upsert({
      user_id: userId,
      nickname: getLocalNickname() || "익명",
      lpt_type_id: profile.typeId,
      xp: profile.xp,
      stats: profile.stats,
      badges: profile.badges,
      quest_log: profile.questLog,
    });
  } catch (error) {
    console.error("[sync] 성장 프로필 업로드 실패", error);
  }
}

export async function pushSurveyToCloud(state: SurveyState): Promise<void> {
  if (!isSupabaseConfigured() || state.answers.length === 0) return;

  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;

    await supabase.from("survey_responses").upsert({
      user_id: userId,
      answers: state.answers,
      computed_at: state.completedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error("[sync] 설문 응답 업로드 실패", error);
  }
}

/**
 * 사용자가 동의한 경우에만, 계정(로그인 여부와 무관)과 전혀 연결되지 않는
 * birth_stats 테이블에 생년월일시·성별·계산된 유형만 저장한다. user_id나
 * 닉네임 등 식별 가능한 정보는 절대 포함하지 않는다 — 로그인 상태를 확인하는
 * 로직조차 없다 (의도적으로 계정과 완전히 분리).
 */
export async function pushAnonymousBirthStats(
  basicInfo: BasicInfo,
  lptTypeId: LptTypeId
): Promise<void> {
  if (!isSupabaseConfigured() || !basicInfo.consentToAnonymousStats) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(basicInfo.birthDate)) return;

  try {
    const supabase = getSupabaseClient();
    await supabase.from("birth_stats").insert({
      birth_date: basicInfo.birthDate,
      birth_time: basicInfo.birthTimeUnknown ? null : basicInfo.birthTime,
      gender: basicInfo.gender,
      calendar_type: basicInfo.calendarType,
      lpt_type_id: lptTypeId,
    });
  } catch (error) {
    console.error("[sync] 익명 통계 저장 실패", error);
  }
}

function cloudProfileToLocal(row: UserProfileRow): GrowthProfile {
  return {
    typeId: row.lpt_type_id as GrowthProfile["typeId"],
    xp: row.xp,
    stats: row.stats,
    questLog: row.quest_log ?? [],
    badges: row.badges ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cloudSurveyToLocal(row: SurveyResponseRow): SurveyState {
  return {
    answers: row.answers,
    currentIndex: row.answers.length,
    startedAt: row.computed_at,
    completedAt: row.computed_at,
  };
}

/**
 * 로그인 직후 1회 호출한다. 클라우드에 이미 데이터가 있으면(다른 기기에서
 * 이어보기) 로컬로 가져와 덮어쓰고, 클라우드가 비어있고 로컬에만 데이터가
 * 있으면(이 기기에서 첫 로그인) 로컬 진행 상황을 클라우드로 올린다.
 */
export async function pullAndMergeOnLogin(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();

  try {
    const [{ data: cloudProfile }, { data: cloudSurvey }] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("survey_responses").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const localProfile = getStorage().get<GrowthProfile>(STORAGE_KEYS.growthProfile);
    const localSurvey = getStorage().get<SurveyState>(STORAGE_KEYS.survey);

    if (cloudProfile) {
      getStorage().set(STORAGE_KEYS.growthProfile, cloudProfileToLocal(cloudProfile as UserProfileRow));
    } else if (localProfile) {
      await pushGrowthProfileToCloud(localProfile);
    }

    if (cloudSurvey) {
      getStorage().set(STORAGE_KEYS.survey, cloudSurveyToLocal(cloudSurvey as SurveyResponseRow));
    } else if (localSurvey && localSurvey.answers.length > 0) {
      await pushSurveyToCloud(localSurvey);
    }
  } catch (error) {
    console.error("[sync] 로그인 동기화 실패", error);
  }
}
