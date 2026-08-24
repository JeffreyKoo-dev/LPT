"use client";

import { useEffect, useState } from "react";
import { AnalysisReport } from "@/types/report";
import { BasicInfo } from "@/types/user";
import { GrowthProfile } from "@/types/growth";
import { LptTypeMeta, FantasyClassMeta } from "@/types/lpt";
import { loadAnalysisReport, generateAndSaveAnalysisReport } from "@/lib/report";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { getLptTypeMeta } from "@/data/lptTypes";
import { getFantasyClass } from "@/data/fantasyClasses";
import { loadGrowthProfile } from "@/lib/growth";

export type SessionStatus = "loading" | "missing-analysis" | "ready";

export interface GrowthSession {
  status: SessionStatus;
  nickname: string;
  report: AnalysisReport | null;
  typeMeta: LptTypeMeta | null;
  fantasyClass: FantasyClassMeta | null;
  profile: GrowthProfile | null;
  setProfile: (profile: GrowthProfile) => void;
}

/**
 * 성장 대시보드/퀘스트/뱃지 화면에서 공통으로 필요한 분석 리포트 + 성장 프로필을
 * 함께 불러오는 클라이언트 훅. 분석 리포트가 없으면 "missing-analysis" 상태를 반환해
 * 각 화면에서 /result 또는 /survey로 안내할 수 있게 한다.
 */
export function useGrowthSession(): GrowthSession {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [nickname, setNickname] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [profile, setProfileState] = useState<GrowthProfile | null>(null);

  useEffect(() => {
    const basicInfo = getStorage().get<BasicInfo>(STORAGE_KEYS.basicInfo);
    let existingReport = loadAnalysisReport();

    // 리포트가 없거나(예: 스키마 버전 불일치로 무효화됨) 기본 정보는 남아있는 경우,
    // 설문을 다시 시키지 않고 조용히 재계산을 시도한다.
    if (!existingReport && basicInfo && /^\d{4}-\d{2}-\d{2}$/.test(basicInfo.birthDate ?? "")) {
      try {
        existingReport = generateAndSaveAnalysisReport(basicInfo);
      } catch {
        existingReport = null;
      }
    }

    if (!basicInfo || !existingReport) {
      setStatus("missing-analysis");
      return;
    }

    setNickname(basicInfo.nickname);
    setReport(existingReport);
    setProfileState(loadGrowthProfile(existingReport.lptType.typeId));
    setStatus("ready");
  }, []);

  const typeMeta = report ? getLptTypeMeta(report.lptType.typeId) ?? null : null;
  const fantasyClass = report ? getFantasyClass(report.lptType.typeId) ?? null : null;

  return {
    status,
    nickname,
    report,
    typeMeta,
    fantasyClass,
    profile,
    setProfile: setProfileState,
  };
}
