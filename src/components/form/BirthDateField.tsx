"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BirthDateFieldProps {
  label: string;
  value: string; // "YYYY-MM-DD" 또는 빈 문자열
  onChange: (value: string) => void;
  error?: string;
}

const CURRENT_YEAR = new Date().getFullYear();

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > CURRENT_YEAR) return false;
  if (month < 1 || month > 12) return false;
  const date = new Date(year, month - 1, day);
  // 2/30처럼 실제로 없는 날짜는 Date 객체가 다음 달로 넘어가버리므로 역으로 검증
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/**
 * 브라우저 기본 달력 위젯(type="date") 대신 년/월/일을 직접 타이핑할 수 있는 입력 필드.
 * 기기·브라우저별 네이티브 date picker 동작 차이 문제를 피하기 위해 도입했다.
 */
export function BirthDateField({ label, value, onChange, error }: BirthDateFieldProps) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  // 외부에서 value가 리셋되는 경우(예: 폼 초기화)에 맞춰 내부 상태도 동기화
  useEffect(() => {
    if (!value) {
      setYear("");
      setMonth("");
      setDay("");
      return;
    }
    const [y, m, d] = value.split("-");
    setYear(y ?? "");
    setMonth(m ? String(Number(m)) : "");
    setDay(d ? String(Number(d)) : "");
  }, [value]);

  function emit(nextYear: string, nextMonth: string, nextDay: string) {
    const y = Number(nextYear);
    const m = Number(nextMonth);
    const d = Number(nextDay);

    if (
      nextYear.length === 4 &&
      nextMonth !== "" &&
      nextDay !== "" &&
      isValidCalendarDate(y, m, d)
    ) {
      const mm = String(m).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      onChange(`${nextYear}-${mm}-${dd}`);
    } else {
      onChange("");
    }
  }

  function handleYearChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setYear(digits);
    emit(digits, month, day);
  }

  function handleMonthChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setMonth(digits);
    emit(year, digits, day);
  }

  function handleDayChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setDay(digits);
    emit(year, month, digits);
  }

  const inputClass =
    "h-12 rounded-xl border border-border bg-surface-2 px-3 text-center text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-fate";

  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            placeholder="1994"
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            maxLength={4}
            aria-label="출생 연도"
            className={cn(inputClass, "pr-7", error && "border-red-400/70")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
            년
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            placeholder="3"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            maxLength={2}
            aria-label="출생 월"
            className={cn(inputClass, "pr-6", error && "border-red-400/70")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
            월
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            placeholder="21"
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            maxLength={2}
            aria-label="출생 일"
            className={cn(inputClass, "pr-6", error && "border-red-400/70")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
            일
          </span>
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
