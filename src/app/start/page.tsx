"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardDescription } from "@/components/common/Card";
import { TextField } from "@/components/form/TextField";
import { BirthDateField } from "@/components/form/BirthDateField";
import { BirthTimeField } from "@/components/form/BirthTimeField";
import { SegmentedControl } from "@/components/form/SegmentedControl";
import { Checkbox } from "@/components/form/Checkbox";
import { PageHeading } from "@/components/common/PageHeading";
import { BasicInfo, CalendarType, Gender } from "@/types/user";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { checkNicknameLocally } from "@/lib/contentModeration";
import { checkContentWithAi } from "@/lib/moderationApi";

type FormErrors = Partial<Record<keyof BasicInfo, string>>;

export default function StartPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState<string | null>(null);
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false);
  const [applyLocalMeanTime, setApplyLocalMeanTime] = useState(true);
  const [calendarType, setCalendarType] = useState<CalendarType>("solar");
  const [gender, setGender] = useState<Gender>("male");
  const [consentToAnonymousStats, setConsentToAnonymousStats] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 실시간 닉네임 검수: 타이핑을 멈춘 뒤 잠깐(0.6초) 있다가 자동으로 확인한다.
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "ok" | "blocked">(
    "idle"
  );
  const lastCheckedNickname = useRef<string>("");

  useEffect(() => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameStatus("idle");
      return;
    }

    // 1차(키워드) 필터는 디바운스 없이 즉시 확인한다 — 네트워크 호출이 아니라 빠르다.
    const localCheck = checkNicknameLocally(trimmed);
    if (!localCheck.allowed) {
      setNicknameStatus("blocked");
      setErrors((prev) => ({ ...prev, nickname: localCheck.reason }));
      lastCheckedNickname.current = trimmed;
      return;
    }

    setNicknameStatus("checking");
    const timer = window.setTimeout(async () => {
      const aiCheck = await checkContentWithAi("nickname", trimmed);
      lastCheckedNickname.current = trimmed;
      if (!aiCheck.allowed) {
        setNicknameStatus("blocked");
        setErrors((prev) => ({ ...prev, nickname: aiCheck.reason ?? "사용할 수 없는 닉네임이에요." }));
      } else {
        setNicknameStatus("ok");
        setErrors((prev) => ({ ...prev, nickname: undefined }));
      }
    }, 600);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname]);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!nickname.trim()) {
      next.nickname = "닉네임을 입력해주세요.";
    } else if (nicknameStatus === "blocked") {
      next.nickname = errors.nickname ?? "사용할 수 없는 표현이 포함되어 있어요.";
    }
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      next.birthDate = "생년월일을 정확히 입력해주세요.";
    }
    if (!birthTimeUnknown && !birthTime) {
      next.birthTime = "출생시간을 입력하거나 '시간을 모름'을 선택해주세요.";
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // 실시간 검수로 이미 같은 닉네임을 확인해둔 상태면 다시 호출하지 않는다.
    // (타이핑 직후 바로 제출하는 등, 아직 실시간 검수가 안 끝났을 수 있어 안전망으로 유지)
    if (lastCheckedNickname.current !== nickname.trim() || nicknameStatus !== "ok") {
      setCheckingNickname(true);
      const aiCheck = await checkContentWithAi("nickname", nickname.trim());
      setCheckingNickname(false);
      if (!aiCheck.allowed) {
        setErrors({ nickname: aiCheck.reason ?? "사용할 수 없는 닉네임이에요." });
        setNicknameStatus("blocked");
        return;
      }
    }

    const basicInfo: BasicInfo = {
      nickname: nickname.trim(),
      birthDate,
      birthTime: birthTimeUnknown ? null : birthTime,
      birthTimeUnknown,
      calendarType,
      gender,
      applyLocalMeanTime: birthTimeUnknown ? false : applyLocalMeanTime,
      consentToAnonymousStats,
      createdAt: new Date().toISOString(),
    };
    getStorage().set(STORAGE_KEYS.basicInfo, basicInfo);
    router.push("/survey");
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <PageHeading
        label="기본 정보 입력"
        title="캐릭터 시트의 첫 줄을 채워주세요"
        description="입력한 정보는 사주 기반 기질 분석에 사용되며, 기기에만 저장됩니다."
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div>
            <TextField
              label="닉네임"
              name="nickname"
              placeholder="캐릭터 카드에 표시될 이름"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              error={errors.nickname}
              maxLength={20}
            />
            {nicknameStatus === "checking" && (
              <p className="mt-1.5 text-xs text-muted">확인 중…</p>
            )}
            {nicknameStatus === "ok" && (
              <p className="mt-1.5 text-xs text-emerald-700">사용 가능한 닉네임이에요.</p>
            )}
          </div>

          <SegmentedControl<CalendarType>
            label="양력·음력"
            value={calendarType}
            onChange={setCalendarType}
            options={[
              { value: "solar", label: "양력" },
              { value: "lunar", label: "음력" },
            ]}
          />

          <BirthDateField
            label="생년월일"
            value={birthDate}
            onChange={setBirthDate}
            error={errors.birthDate}
          />

          <div>
            <BirthTimeField
              label="출생시간"
              value={birthTime}
              onChange={setBirthTime}
              disabled={birthTimeUnknown}
              hint="정확한 사주 계산을 위해 가능하면 입력해주세요. (24시간제)"
              error={errors.birthTime}
            />
            <div className="mt-2">
              <Checkbox
                label="출생시간을 모릅니다"
                checked={birthTimeUnknown}
                onChange={(e) => setBirthTimeUnknown(e.target.checked)}
              />
            </div>
            {!birthTimeUnknown && (
              <div className="mt-3 rounded-xl border border-border bg-surface-2/60 p-3">
                <Checkbox
                  label="진태양시(정밀 시간) 보정 적용"
                  checked={applyLocalMeanTime}
                  onChange={(e) => setApplyLocalMeanTime(e.target.checked)}
                />
                <p className="mt-1.5 pl-6 text-xs text-muted">
                  표준시(동경 135도)와 실제 태양 위치의 차이만큼(최대 약 32분) 시간을
                  보정합니다. 서울 경도 기준 근사치이며, 대부분의 만세력이 이 방식을
                  사용해 기본으로 켜져 있습니다. 시계에 나온 시간 그대로 계산하려면
                  꺼주세요.
                </p>
              </div>
            )}
          </div>

          <SegmentedControl<Gender>
            label="성별"
            value={gender}
            onChange={setGender}
            options={[
              { value: "male", label: "남성" },
              { value: "female", label: "여성" },
            ]}
          />

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={checkingNickname}>
            {checkingNickname ? "확인 중…" : "성향 설문으로 이동하기"}
          </Button>

          <div className="rounded-xl border border-border bg-surface-2/60 p-3">
            <Checkbox
              label="익명 통계 목적으로 결과 데이터 제공에 동의합니다"
              checked={consentToAnonymousStats}
              onChange={(e) => setConsentToAnonymousStats(e.target.checked)}
            />
            <p className="mt-1.5 pl-6 text-xs text-muted">
              동의하시면 계정과 전혀 연결되지 않는 별도 저장소에 생년월일시·성별과
              계산된 유형만 저장됩니다. 닉네임이나 계정 정보는 포함되지 않으며,
              서비스 통계 개선 목적 외에는 사용되지 않습니다. 선택 사항이며,
              동의하지 않아도 서비스 이용에는 아무 영향이 없습니다.
            </p>
          </div>
        </form>
      </Card>

      <CardDescription className="mt-6 text-center">
        성별 및 출생 정보는 사주 계산에만 사용되며, 공유 카드에는 노출되지 않습니다.
      </CardDescription>
    </div>
  );
}
