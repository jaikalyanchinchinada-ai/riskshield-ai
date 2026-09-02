// ============================================================================
// RiskShield AI — Risk Level Mapping
// ============================================================================

import { RISK_LEVEL_THRESHOLDS } from "./config";
import type { RiskLevel } from "./types";

export function scoreToRiskLevel(score: number): RiskLevel {
  const clamped = Math.min(100, Math.max(0, score));
  const match = RISK_LEVEL_THRESHOLDS.find((t) => clamped >= t.min && clamped <= t.max);
  return match ? match.level : "LOW";
}

export const RISK_LEVEL_COLORS: Record<RiskLevel, { text: string; bg: string; border: string }> = {
  LOW: { text: "text-risk-low", bg: "bg-risk-lowBg", border: "border-risk-low" },
  MEDIUM: { text: "text-risk-medium", bg: "bg-risk-mediumBg", border: "border-risk-medium" },
  HIGH: { text: "text-risk-high", bg: "bg-risk-highBg", border: "border-risk-high" },
  CRITICAL: { text: "text-risk-critical", bg: "bg-risk-criticalBg", border: "border-risk-critical" },
};
