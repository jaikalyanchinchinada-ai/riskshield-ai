"use client";

import type { RiskLevel } from "@/lib/risk-engine/types";

const LEVEL_COLOR: Record<RiskLevel, string> = {
  LOW: "#16A34A",
  MEDIUM: "#CA8A04",
  HIGH: "#EA580C",
  CRITICAL: "#DC2626",
};

export function RiskMeter({
  score,
  level,
  size = 160,
}: {
  score: number;
  level: RiskLevel;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 70;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (clamped / 100) * circumference;
  const color = LEVEL_COLOR[level];

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 180 100" width={size} height={size * 0.6}>
        <path
          d="M 10 90 A 80 80 0 0 1 170 90"
          fill="none"
          stroke="#E3E8F0"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d="M 10 90 A 80 80 0 0 1 170 90"
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="-mt-8 text-center">
        <div className="text-3xl font-bold tabular-nums" style={{ color }}>
          {Math.round(clamped)}
        </div>
        <div className="text-xs text-canvas-muted">out of 100</div>
      </div>
    </div>
  );
}
