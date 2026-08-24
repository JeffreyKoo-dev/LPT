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
  const [skippedNotice, setSkippedNotice] = useState(false);

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

  /** 응답하지 않은 문항 중 첫 번째 인덱스를 찾는다. 전부 응답했으면 -1 */
  function findFirstUnansweredIndex(s: SurveyState): number {
    return QUESTIONS.findIndex((q) => getAnswerFor(s, q.id) === null);
  }

  function handleAnswer(value: number) {
    if (!state) return;
    setSkippedNotice(false);
    const updated = upsertAnswer(state, { questionId: question.id, value });
    persist(updated);

    if (index === QUESTIONS.length - 1) {
      // 마지막 문항까지 왔어도 중간에 빠뜨린 문항이 있을 수 있으니 먼저 확인한다
      const unansweredIndex = findFirstUnansweredIndex(updated);
      if (unansweredIndex === -1) {
        persist(markCompleted(updated));
      } else {
        setSkippedNotice(true);
        setIndex(unansweredIndex);
      }
    } else {
      window.setTimeout(() => setIndex((i) => Math.min(i + 1, QUESTIONS.length - 1)), 180);
    }
  }

  function goPrev() {
    setSkippedNotice(false);
    setIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    if (currentAnswer === null) return;
    if (index === QUESTIONS.length - 1 && state) {
      const unansweredIndex = findFirstUnansweredIndex(state);
      if (unansweredIndex === -1) {
        persist(markCompleted(state));
      } else {
        setSkippedNotice(true);
        setIndex(unansweredIndex);
      }
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
        {skippedNotice && (
          <p className="mb-3 rounded-lg border border-fate/30 bg-fate-soft px-3 py-2 text-xs text-fate">
            답변하지 않은 문항이 있어 이 문항으로 이동했어요.
          </p>
        )}
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
  const [status, setStatus] = useState<"idle" | "no-basic-info" | "error" | "done">("idle");
  const [typeName, setTypeName] = useState<string | null>(null);
  const [fantasyClassName, setFantasyClassName] = useState<string | null>(null);

  useEffect(() => {
    const basicInfo = getStorage().get<BasicInfo>(STORAGE_KEYS.basicInfo);
    if (!basicInfo || !/^\d{4}-\d{2}-\d{2}$/.test(basicInfo.birthDate ?? "")) {
      setStatus("no-basic-info");
      return;
    }
    try {
      const report = generateAndSaveAnalysisReport(basicInfo);
      const meta = getLptTypeMeta(report.lptType.typeId);
      setTypeName(meta?.name ?? null);
      setFantasyClassName(getFantasyClass(report.lptType.typeId)?.className ?? null);
      setStatus("done");
    } catch (error) {
      console.error("[survey] 분석 리포트 생성 실패", error);
      setStatus("error");
    }
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
            생년월일시를 아직 입력하지 않았거나 형식이 올바르지 않아 사주 기반 유형
            분석을 진행할 수 없습니다. 기본 정보를 다시 입력해주세요.
          </CardDescription>
          <Button className="mt-4" onClick={() => router.push("/start")}>
            기본 정보 입력하러 가기
          </Button>
        </Card>
      )}

      {status === "error" && (
        <Card className="mt-8 text-left">
          <CardTitle>분석 중 문제가 발생했어요</CardTitle>
          <CardDescription className="mt-2">
            입력하신 생년월일 정보로 사주 분석을 계산하는 중 오류가 발생했습니다.
            기본 정보를 다시 확인해주세요.
          </CardDescription>
          <Button className="mt-4" onClick={() => router.push("/start")}>
            기본 정보 다시 입력하기
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
