"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card, CardDescription } from "@/components/common/Card";
import { TextField } from "@/components/form/TextField";
import { BirthDateField } from "@/components/form/BirthDateField";
import { SegmentedControl } from "@/components/form/SegmentedControl";
import { Checkbox } from "@/components/form/Checkbox";
import { BasicInfo, CalendarType, Gender } from "@/types/user";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";

type FormErrors = Partial<Record<keyof BasicInfo, string>>;

export default function StartPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false);
  const [calendarType, setCalendarType] = useState<CalendarType>("solar");
  const [gender, setGender] = useState<Gender>("male");
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!nickname.trim()) next.nickname = "닉네임을 입력해주세요.";
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      next.birthDate = "생년월일을 정확히 입력해주세요.";
    }
    if (!birthTimeUnknown && !birthTime) {
      next.birthTime = "출생시간을 입력하거나 '시간을 모름'을 선택해주세요.";
    }
    return next;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const basicInfo: BasicInfo = {
      nickname: nickname.trim(),
      birthDate,
      birthTime: birthTimeUnknown ? null : birthTime,
      birthTimeUnknown,
      calendarType,
      gender,
      createdAt: new Date().toISOString(),
    };

    getStorage().set(STORAGE_KEYS.basicInfo, basicInfo);
    router.push("/survey");
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <div className="mb-8 text-center">
        <p className="text-xs text-fate">기본 정보 입력</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
          캐릭터 시트의 첫 줄을 채워주세요
        </h1>
        <p className="mt-2 text-sm text-muted">
          입력한 정보는 사주 기반 기질 분석에 사용되며, 기기에만 저장됩니다.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <TextField
            label="닉네임"
            name="nickname"
            placeholder="캐릭터 카드에 표시될 이름"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            error={errors.nickname}
            maxLength={20}
          />

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
            <TextField
              label="출생시간"
              name="birthTime"
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              disabled={birthTimeUnknown}
              hint="정확한 사주 계산을 위해 가능하면 입력해주세요."
              error={errors.birthTime}
            />
            <div className="mt-2">
              <Checkbox
                label="출생시간을 모릅니다"
                checked={birthTimeUnknown}
                onChange={(e) => setBirthTimeUnknown(e.target.checked)}
              />
            </div>
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

          <Button type="submit" size="lg" className="mt-2 w-full">
            성향 설문으로 이동하기
          </Button>
        </form>
      </Card>

      <CardDescription className="mt-6 text-center">
        성별 및 출생 정보는 사주 계산에만 사용되며, 공유 카드에는 노출되지 않습니다.
      </CardDescription>
    </div>
  );
}
