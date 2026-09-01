"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BirthTimeFieldProps {
  label: string;
  value: string | null; // "HH:mm" (24시간제) 또는 null
  onChange: (value: string | null) => void;
  disabled?: boolean;
  hint?: string;
  error?: string;
}

/**
 * 브라우저 기본 시간 위젯(type="time") 대신 시/분을 24시간제로 직접 타이핑하는 필드.
 * 네이티브 위젯은 브라우저·OS 로케일에 따라 오전/오후 표시 순서가 제각각이라
 * 혼란을 주므로, 오전/오후 개념 자체를 없애고 0~23시로 통일했다.
 */
export function BirthTimeField({
  label,
  value,
  onChange,
  disabled,
  hint,
  error,
}: BirthTimeFieldProps) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");

  useEffect(() => {
    if (!value) {
      setHour("");
      setMinute("");
      return;
    }
    const [h, m] = value.split(":");
    setHour(h ? String(Number(h)) : "");
    setMinute(m ? String(Number(m)) : "");
  }, [value]);

  function emit(nextHour: string, nextMinute: string) {
    const h = Number(nextHour);
    const m = Number(nextMinute);
    if (nextHour !== "" && nextMinute !== "" && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    } else {
      onChange(null);
    }
  }

  function handleHourChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setHour(digits);
    emit(digits, minute);
  }

  function handleMinuteChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setMinute(digits);
    emit(hour, digits);
  }

  const inputClass = cn(
    "h-12 w-16 rounded-xl border border-border bg-surface-2 px-3 text-center text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-fate",
    disabled && "cursor-not-allowed opacity-50",
    error && "border-red-400/70"
  );

  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="14"
          value={hour}
          disabled={disabled}
          onChange={(e) => handleHourChange(e.target.value)}
          maxLength={2}
          aria-label="출생 시(0~23시)"
          className={inputClass}
        />
        <span className="text-sm text-muted">시</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="30"
          value={minute}
          disabled={disabled}
          onChange={(e) => handleMinuteChange(e.target.value)}
          maxLength={2}
          aria-label="출생 분"
          className={inputClass}
        />
        <span className="text-sm text-muted">분</span>
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
