"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { GuardScreen } from "@/components/common/GuardScreen";
import { TextField } from "@/components/form/TextField";
import { BirthDateField } from "@/components/form/BirthDateField";
import { BirthTimeField } from "@/components/form/BirthTimeField";
import { SegmentedControl } from "@/components/form/SegmentedControl";
import { Checkbox } from "@/components/form/Checkbox";
import { CompatibilityResultCard } from "@/components/result/CompatibilityResultCard";
import { useGrowthSession } from "@/lib/useGrowthSession";
import { calculateSaju } from "@/lib/saju";
import { computeCompatibility, CompatibilityResult } from "@/lib/compatibility";
import { CalendarType } from "@/types/user";

export default function CompatibilityPage() {
  const router = useRouter();
  const session = useGrowthSession();

  const [nicknameB, setNicknameB] = useState("");
  const [birthDateB, setBirthDateB] = useState("");
  const [birthTimeB, setBirthTimeB] = useState<string | null>(null);
  const [birthTimeUnknownB, setBirthTimeUnknownB] = useState(false);
  const [calendarTypeB, setCalendarTypeB] = useState<CalendarType>("solar");
  const [applyLocalMeanTimeB, setApplyLocalMeanTimeB] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompatibilityResult | null>(null);

  if (session.status === "loading") {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        불러오는 중입니다…
      </div>
    );
  }

  if (session.status === "missing-analysis" || !session.report) {
    return (
      <GuardScreen
        title="먼저 내 결과가 필요해요"
        description="기본 정보 입력과 설문을 완료하면 지인과의 관계 적합도를 볼 수 있어요."
        actionLabel="시작하러 가기"
        onAction={() => router.push("/start")}
      />
    );
  }

  function handleCalculate() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateB)) {
      setError("상대방의 생년월일을 정확히 입력해주세요.");
      return;
    }
    setError(null);
    try {
      const chartB = calculateSaju({
        nickname: nicknameB || "상대방",
        birthDate: birthDateB,
        birthTime: birthTimeUnknownB ? null : birthTimeB,
        birthTimeUnknown: birthTimeUnknownB,
        calendarType: calendarTypeB,
        gender: "male", // 궁합 계산(오행 기반)에는 성별이 영향을 주지 않음
        applyLocalMeanTime: birthTimeUnknownB ? false : applyLocalMeanTimeB,
        createdAt: "",
      });
      const compat = computeCompatibility(
        session.report!.sajuChart,
        chartB,
        session.report!.lptType.quadrant
      );
      setResult(compat);
    } catch {
      setError("입력하신 정보로 계산하지 못했어요. 날짜를 다시 확인해주세요.");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      <div className="mb-6 text-center">
        <p className="text-xs text-fate">관계 적합도</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
          지인과의 궁합을 확인해보세요
        </h1>
        <p className="mt-2 text-xs text-muted">
          상대방 정보는 이 계산에만 사용되며 저장되지 않습니다.
        </p>
      </div>

      {!result && (
        <Card>
          <div className="flex flex-col gap-6">
            <TextField
              label="상대방 닉네임"
              name="nicknameB"
              placeholder="예: 친구, 동료 이름"
              value={nicknameB}
              onChange={(e) => setNicknameB(e.target.value)}
            />

            <SegmentedControl<CalendarType>
              label="양력·음력"
              value={calendarTypeB}
              onChange={setCalendarTypeB}
              options={[
                { value: "solar", label: "양력" },
                { value: "lunar", label: "음력" },
              ]}
            />

            <BirthDateField
              label="생년월일"
              value={birthDateB}
              onChange={setBirthDateB}
              error={error ?? undefined}
            />

            <div>
              <BirthTimeField
                label="출생시간"
                value={birthTimeB}
                onChange={setBirthTimeB}
                disabled={birthTimeUnknownB}
                hint="모르면 아래 체크박스를 선택해주세요."
              />
              <div className="mt-2">
                <Checkbox
                  label="출생시간을 모릅니다"
                  checked={birthTimeUnknownB}
                  onChange={(e) => setBirthTimeUnknownB(e.target.checked)}
                />
              </div>
              {!birthTimeUnknownB && (
                <div className="mt-3">
                  <Checkbox
                    label="진태양시(정밀 시간) 보정 적용"
                    checked={applyLocalMeanTimeB}
                    onChange={(e) => setApplyLocalMeanTimeB(e.target.checked)}
                  />
                </div>
              )}
            </div>

            <Button size="lg" onClick={handleCalculate}>
              관계 적합도 계산하기
            </Button>
          </div>
        </Card>
      )}

      {result && (
        <>
          <CompatibilityResultCard
            nicknameA={session.nickname}
            nicknameB={nicknameB || "상대방"}
            result={result}
          />
          <Button
            variant="ghost"
            className="mt-6 w-full"
            onClick={() => {
              setResult(null);
              setError(null);
            }}
          >
            다른 사람과 다시 확인하기
          </Button>
        </>
      )}
    </div>
  );
}
