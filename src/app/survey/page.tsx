"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";
import { ProgressBar } from "@/components/common/ProgressBar";
import { LikertScale } from "@/components/form/LikertScale";
import { QUESTIONS } from "@/data/questions";
import { TOTAL_QUESTIONS } from "@/types/survey";
import {
  getAnswerFor,
  isSurveyComplete,
  loadSurveyState,
  markCompleted,
  resetSurvey,
  saveSurveyState,
  upsertAnswer,
} from "@/lib/survey";
import type { SurveyState } from "@/types/survey";
import { generateAndSaveAnalysisReport } from "@/lib/report";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { BasicInfo } from "@/types/user";
import { getLptTypeMeta } from "@/data/lptTypes";
import { getFantasyClass } from "@/data/fantasyClasses";

const AXIS_LABEL: Record<string, string> = {
  EI: "에너지 방향",
  SN: "정보 인식",
  TF: "판단 기준",
  JP: "생활 방식",
};

export default function SurveyPage() {
  const [state, setState] = useState<SurveyState | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const loaded = loadSurveyState();
    setState(loaded);
    // 마지막으로 답하지 않은 문항부터 이어서 시작
    const firstUnanswered = QUESTIONS.findIndex(
      (q) => getAnswerFor(loaded, q.id) === null
    );
    setIndex(firstUnanswered === -1 ? QUESTIONS.length - 1 : firstUnanswered);
  }, []);

  if (!state) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        설문을 불러오는 중입니다…
      </div>
    );
  }

  const complete = isSurveyComplete(state);

  if (complete) {
    return <SurveyComplete onReset={() => {
      resetSurvey();
      setState(loadSurveyState());
      setIndex(0);
    }} />;
  }

  const question = QUESTIONS[index];
  const currentAnswer = getAnswerFor(state, question.id);

  function persist(nextState: SurveyState) {
    setState(nextState);
    saveSurveyState(nextState);
  }

  function handleAnswer(value: number) {
    if (!state) return;
    const updated = upsertAnswer(state, { questionId: question.id, value });
    persist(updated);

    // 마지막 문항이면 완료 처리, 아니면 다음 문항으로 자동 이동
    if (index === QUESTIONS.length - 1) {
      persist(markCompleted(updated));
    } else {
      window.setTimeout(() => setIndex((i) => Math.min(i + 1, QUESTIONS.length - 1)), 180);
    }
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    if (currentAnswer === null) return;
    if (index === QUESTIONS.length - 1 && state) {
      persist(markCompleted(state));
      return;
    }
    setIndex((i) => Math.min(QUESTIONS.length - 1, i + 1));
  }

  const answeredCount = state.answers.length;

  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>{AXIS_LABEL[question.axis]}</span>
          <span className="font-numeral">
            {index + 1} / {TOTAL_QUESTIONS}
          </span>
        </div>
        <ProgressBar
          value={(answeredCount / TOTAL_QUESTIONS) * 100}
          colorClassName="bg-fate"
        />
      </div>

      <Card key={question.id} className="animate-rise">
        <CardTitle className="text-xl leading-relaxed">{question.text}</CardTitle>
        <div className="mt-8">
          <LikertScale
            value={currentAnswer}
            onChange={handleAnswer}
            leftLabel={question.leftLabel}
            rightLabel={question.rightLabel}
          />
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={goPrev} disabled={index === 0}>
          이전
        </Button>
        <Button variant="secondary" onClick={goNext} disabled={currentAnswer === null}>
          {index === QUESTIONS.length - 1 ? "완료" : "다음"}
        </Button>
      </div>
    </div>
  );
}

function SurveyComplete({ onReset }: { onReset: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "no-basic-info" | "done">("idle");
  const [typeName, setTypeName] = useState<string | null>(null);
  const [fantasyClassName, setFantasyClassName] = useState<string | null>(null);

  useEffect(() => {
    const basicInfo = getStorage().get<BasicInfo>(STORAGE_KEYS.basicInfo);
    if (!basicInfo || !basicInfo.birthDate) {
      setStatus("no-basic-info");
      return;
    }
    const report = generateAndSaveAnalysisReport(basicInfo);
    const meta = getLptTypeMeta(report.lptType.typeId);
    setTypeName(meta?.name ?? null);
    setFantasyClassName(getFantasyClass(report.lptType.typeId)?.className ?? null);
    setStatus("done");
  }, []);

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <p className="text-xs text-growth">설문 완료</p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
        36문항 응답이 모두 저장되었습니다
      </h1>

      {status === "no-basic-info" && (
        <Card className="mt-8 text-left">
          <CardTitle>기본 정보가 필요해요</CardTitle>
          <CardDescription className="mt-2">
            생년월일시를 아직 입력하지 않아 사주 기반 유형 분석을 진행할 수 없습니다.
            기본 정보 입력 후 다시 시도해주세요.
          </CardDescription>
          <Button className="mt-4" onClick={() => router.push("/start")}>
            기본 정보 입력하러 가기
          </Button>
        </Card>
      )}

      {status === "done" && typeName && (
        <Card className="mt-8 text-left">
          <p className="text-xs text-fate">당신의 LPT 유형은</p>
          <CardTitle className="mt-1 text-2xl">{typeName}</CardTitle>
          {fantasyClassName && (
            <p className="mt-1 text-sm text-growth">{fantasyClassName}</p>
          )}
          <CardDescription className="mt-2">
            사주 기반 기질과 설문 응답을 결합한 결과입니다. 아래 버튼으로 캐릭터
            카드와 라이프스타일 인디케이터가 담긴 전체 리포트를 확인할 수 있어요.
          </CardDescription>
        </Card>
      )}

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {status === "done" && (
          <Button onClick={() => router.push("/result")}>결과 리포트 보기</Button>
        )}
        <Button variant="secondary" onClick={() => router.push("/")}>
          홈으로 이동
        </Button>
        <Button variant="ghost" onClick={onReset}>
          설문 다시하기
        </Button>
      </div>
    </div>
  );
}
