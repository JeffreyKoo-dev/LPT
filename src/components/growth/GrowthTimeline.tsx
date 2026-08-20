import { CheckCircle2, TrendingUp, Award, LucideIcon } from "lucide-react";
import { GrowthEvent } from "@/types/growth";
import { cn } from "@/lib/utils";

const TYPE_STYLE: Record<GrowthEvent["type"], { icon: LucideIcon; color: string }> = {
  quest: { icon: CheckCircle2, color: "border-fate/40 text-fate" },
  levelup: { icon: TrendingUp, color: "border-growth/40 text-growth" },
  badge: { icon: Award, color: "border-growth/40 text-growth" },
};

interface GrowthTimelineProps {
  events: GrowthEvent[];
}

export function GrowthTimeline({ events }: GrowthTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        아직 기록이 없어요. 첫 퀘스트를 완료하면 여기에 쌓이기 시작해요.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-5 border-l border-border pl-6">
      {events.map((event, i) => {
        const style = TYPE_STYLE[event.type];
        const Icon = style.icon;
        return (
          <li key={`${event.timestamp}-${i}`} className="relative">
            <span
              className={cn(
                "absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border bg-bg",
                style.color
              )}
            >
              <Icon size={13} strokeWidth={1.75} />
            </span>
            <p className="text-xs text-muted">
              {new Date(event.timestamp).toLocaleString("ko-KR", {
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{event.title}</p>
            <p className="text-xs text-muted">{event.description}</p>
          </li>
        );
      })}
    </ol>
  );
}
