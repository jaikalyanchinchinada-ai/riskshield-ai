// ============================================================================
// RiskShield AI — Recommended Action Engine
// ----------------------------------------------------------------------------
// The action is mostly driven by the risk level, but the spec explicitly
// asks that it also depend on *which* factors fired — not the score alone.
// Two transactions with the same score can deserve different actions:
// a CRITICAL score built mostly from a strong, well-understood signal
// (huge amount anomaly) is safer to auto-block than a CRITICAL score built
// mostly from the ML model's anomaly signal with little rule-based evidence
// behind it — that second case is better routed to a human.
// ============================================================================

import { ACTION_THRESHOLDS } from "./config";
import type {
  ActionDecision,
  RiskFactorCategory,
  RiskFactorResult,
  RiskLevel,
} from "./types";

function factorPoints(factors: RiskFactorResult[], category: RiskFactorCategory): number {
  return factors.find((f) => f.category === category)?.impact ?? 0;
}

export function decideAction(
  riskLevel: RiskLevel,
  factors: RiskFactorResult[],
  ruleScore: number
): ActionDecision {
  const t = ACTION_THRESHOLDS;
  const deviceRisk = factorPoints(factors, "device_risk");
  const locationRisk = factorPoints(factors, "location_risk");
  const velocityRisk = factorPoints(factors, "velocity_risk");
  const failedAttemptRisk = factorPoints(factors, "failed_attempt_risk");
  const behavioral = factorPoints(factors, "behavioral_anomaly");

  const topFactor = factors[0];

  if (riskLevel === "LOW") {
    const strongOutlier = factors.find((f) => f.impact >= t.lowSingleFactorEscalation);
    if (strongOutlier) {
      return {
        action: "monitor",
        reason: `Overall score is low, but one factor ("${strongOutlier.description}") is notable enough to keep an eye on`,
        supportingFactors: [strongOutlier.category],
      };
    }
    return {
      action: "approve",
      reason: "No significant risk indicators were found for this transaction",
      supportingFactors: [],
    };
  }

  if (riskLevel === "MEDIUM") {
    if (
      velocityRisk >= t.mediumAcuteVelocity ||
      failedAttemptRisk >= t.mediumAcuteFailedAttempts ||
      behavioral > 0
    ) {
      return {
        action: "verify",
        reason:
          behavioral > 0
            ? "Multiple independent risk signals occurred together — that compounding pattern warrants verification even at a medium score"
            : "Transaction velocity or failed-attempt activity is acute enough to request extra verification",
        supportingFactors: ["velocity_risk", "failed_attempt_risk", "behavioral_anomaly"].filter(
          (c) => factorPoints(factors, c as RiskFactorCategory) > 0
        ) as RiskFactorCategory[],
      };
    }
    return {
      action: "monitor",
      reason: "Risk level is medium; keep the account under observation for repeat patterns",
      supportingFactors: factors.slice(0, 2).map((f) => f.category),
    };
  }

  if (riskLevel === "HIGH") {
    const takeoverPattern =
      deviceRisk >= t.highTakeoverDeviceLocationMin && locationRisk >= t.highTakeoverDeviceLocationMin;
    if (takeoverPattern || failedAttemptRisk >= (t.highTakeoverFailedAttempts * 2)) {
      return {
        action: "manual_review",
        reason: takeoverPattern
          ? "New device and new location occurred together — a pattern consistent with account takeover, best judged by a human analyst"
          : "A high number of failed attempts combined with an already-high score warrants direct analyst review",
        supportingFactors: ["device_risk", "location_risk", "failed_attempt_risk"].filter(
          (c) => factorPoints(factors, c as RiskFactorCategory) > 0
        ) as RiskFactorCategory[],
      };
    }
    return {
      action: "verify",
      reason: "Risk level is high; request additional identity verification before allowing this transaction",
      supportingFactors: factors.slice(0, 3).map((f) => f.category),
    };
  }

  // riskLevel === "CRITICAL"
  if (ruleScore >= t.criticalAutoBlockRuleScore) {
    return {
      action: "block",
      reason: `Strong, well-explained evidence of fraud risk (rule score ${ruleScore}/100)${
        topFactor ? `, led by "${topFactor.description}"` : ""
      }`,
      supportingFactors: factors.slice(0, 3).map((f) => f.category),
    };
  }

  // Score is CRITICAL mostly because of the ML anomaly signal rather than
  // strong rule-based evidence — route to a human instead of auto-blocking.
  return {
    action: "manual_review",
    reason: `The blended score is critical, but the explainable rule engine alone only found ${ruleScore}/100 — the anomaly model is flagging something the rules don't fully explain. Escalate to a human analyst rather than auto-blocking`,
    supportingFactors: factors.slice(0, 3).map((f) => f.category),
  };
}

export const ACTION_LABELS: Record<string, string> = {
  approve: "Approve",
  monitor: "Monitor",
  verify: "Request Verification",
  manual_review: "Send to Manual Review",
  block: "Block",
};
