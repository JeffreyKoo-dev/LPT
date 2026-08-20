"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Element } from "@/types/saju";
import { CardTitle, CardDescription } from "@/components/common/Card";

const ELEMENT_ORDER: { key: Element; label: string }[] = [
  { key: "wood", label: "목" },
  { key: "fire", label: "화" },
  { key: "earth", label: "토" },
  { key: "metal", label: "금" },
  { key: "water", label: "수" },
];

interface ElementRadarProps {
  elementCounts: Record<Element, number>;
}

export function ElementRadar({ elementCounts }: ElementRadarProps) {
  const data = ELEMENT_ORDER.map(({ key, label }) => ({
    element: label,
    value: elementCounts[key],
  }));

  return (
    <div>
      <CardTitle>오행 분포</CardTitle>
      <CardDescription className="mt-1">
        사주 8글자(시주 모를 경우 6글자) 안에 담긴 오행의 비중입니다.
      </CardDescription>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="element"
              tick={{ fill: "var(--muted)", fontSize: 13 }}
            />
            <PolarRadiusAxis
              angle={90}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              tickCount={4}
            />
            <Radar
              dataKey="value"
              stroke="var(--fate)"
              fill="var(--fate)"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
