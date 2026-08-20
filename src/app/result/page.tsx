"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardTitle } from "@/components/common/Card";
import { GuardScreen } from "@/components/common/GuardScreen";
import { CharacterCard } from "@/components/result/CharacterCard";
import { ElementRadar } from "@/components/result/ElementRadar";
import { AxisScoreBars } from "@/components/result/AxisScoreBars";
import { TenGodsPanel } from "@/components/result/TenGodsPanel";
import { LifestyleIndicatorPanel } from "@/components/result/LifestyleIndicatorPanel";
import { SynergyPanel } from "@/components/result/SynergyPanel";
import { DailyCardWidget } from "@/components/result/DailyCardWidget";
import { AnalysisReport } from "@/types/report";
import { BasicInfo } from "@/types/user";
import { loadAnalysisReport, generateAndSaveAnalysisReport } from "@/lib/report";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { getLptTypeMeta } from "@/data/lptTypes";
import { getFantasyClass } from "@/data/fantasyClasses";
import { computeLifestyleIndicator } from "@/lib/indicator";

type LoadState = "loading" | "missing-basic-info" | "missing-survey" | "ready";

export default function ResultPage() {
  const router = useRouter();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [nickname, setNickname] = useState("");
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    const basicInfo = getStorage().get<BasicInfo>(STORAGE_KEYS.basicInfo);
    if (!basicInfo || !basicInfo.birthDate) {
      setState("missing-basic-info");
      return;
    }
    setNickname(basicInfo.nickname);

    let existing = loadAnalysisReport();
    if (!existing) {
      // 설문을 마쳤지만 아직 분석 리포트가 없는 경우(예: 직접 URL 접근) 즉시 계산 시도
      try {
        existing = generateAndSaveAnalysisReport(basicInfo);
      } catch {
        existing = null;
      }
    }

    if (!existing) {
      setState("missing-survey");
      return;
    }

    setReport(existing);
    setState("ready");
  }, []);

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        결과를 불러오는 중입니다…
      </div>
    );
  }

  if (state === "missing-basic-info") {
    return (
      <GuardScreen
        title="기본 정보가 필요해요"
        description="사주 기반 분석을 위해 먼저 기본 정보를 입력해주세요."
        actionLabel="기본 정보 입력하러 가기"
        onAction={() => router.push("/start")}
      />
    );
  }

  if (state === "missing-survey" || !report) {
    return (
      <GuardScreen
        title="설문 응답이 필요해요"
        description="36문항 설문을 완료하면 사주와 결합한 LPT 유형을 볼 수 있어요."
        actionLabel="설문하러 가기"
        onAction={() => router.push("/survey")}
      />
    );
  }

  const typeMeta = getLptTypeMeta(report.lptType.typeId);
  const fantasyClass = getFantasyClass(report.lptType.typeId);

  if (!typeMeta || !fantasyClass) {
    return (
      <GuardScreen
        title="결과를 불러오지 못했어요"
        description="유형 데이터를 찾을 수 없습니다. 설문을 다시 진행해주세요."
        actionLabel="설문 다시하기"
        onAction={() => router.push("/survey")}
      />
    );
  }

  const indicator = computeLifestyleIndicator(report.surveyScores, report.lptType.energyGroup);

  return (
    <div className="relative">
      <section className="px-5 pb-6 pt-14">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-xs text-fate">{nickname}님의 LPT 분석 리포트</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            결과 리포트
          </h1>
          <p className="mt-2 text-xs text-muted">
            모든 결과는 확정된 사실이 아닌, 참고할 수 있는 경향과 가능성입니다.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-lg gap-5 px-5 pb-24">
        <CharacterCard nickname={nickname} typeMeta={typeMeta} fantasyClass={fantasyClass} />

        <DailyCardWidget quadrant={report.lptType.quadrant} />

        <Card>
          <ElementRadar elementCounts={report.sajuChart.elementCounts} />
        </Card>

        <Card>
          <AxisScoreBars scores={report.surveyScores} />
        </Card>

        <Card>
          <LifestyleIndicatorPanel indicator={indicator} />
        </Card>

        <Card>
          <TenGodsPanel sajuChart={report.sajuChart} />
        </Card>

        <Card>
          <SynergyPanel typeMeta={typeMeta} />
        </Card>

        <Card className="text-center">
          <CardTitle>{typeMeta.description}</CardTitle>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="w-full" onClick={() => router.push("/dashboard")}>
            성장 대시보드로 이동
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => router.push("/")}>
            홈으로
          </Button>
        </div>
      </section>
    </div>
  );
}
