import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineErrorProps {
  children: React.ReactNode;
  className?: string;
}

/** 폼/액션 실패 시 보여주는 짧은 인라인 에러 메시지. 아이콘으로 눈에 띄게 만든다. */
export function InlineError({ children, className }: InlineErrorProps) {
  return (
    <p className={cn("mt-2 flex items-start gap-1.5 text-xs text-red-600", className)}>
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
