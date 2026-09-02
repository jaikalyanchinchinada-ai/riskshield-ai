// ============================================================================
// RiskShield AI — Risk Engine Orchestrator
// ----------------------------------------------------------------------------
// This is the single entry point the rest of the app should call.
// It ties together: feature-based rules -> blended score -> risk level ->
// recommended action -> sorted, explainable factor list.
//
//   Final Risk Score = 0.60 x Rule Score + 0.40 x ML Anomaly Score
//
// The ML anomaly score is computed elsewhere (lib/ml) and passed in here,
// so this file has zero knowledge of Python, subprocesses, or model files —
// it only knows how to combine two numbers and explain the result.
// ============================================================================

import { BLEND_WEIGHTS } from "./config";
import { runRuleEngine } from "./rules";
import { scoreToRiskLevel } from "./level";
import { decideAction } from "./action";
import type { RawTransactionInput, RiskAssessmentResult } from "./types";

export function assessRisk(
  input: RawTransactionInput,
  mlAnomalyScore: number
): RiskAssessmentResult {
  const { score: ruleScore, breakdown, factors } = runRuleEngine(input);

  const clampedMl = Math.min(100, Math.max(0, Math.round(mlAnomalyScore)));
  const finalScoreRaw = BLEND_WEIGHTS.rule * ruleScore + BLEND_WEIGHTS.ml * clampedMl;
  const finalScore = Math.min(100, Math.max(0, Math.round(finalScoreRaw)));

  const riskLevel = scoreToRiskLevel(finalScore);
  const action = decideAction(riskLevel, factors, ruleScore);

  return {
    ruleScore,
    ruleBreakdown: breakdown,
    mlAnomalyScore: clampedMl,
    finalScore,
    riskLevel,
    riskFactors: factors,
    action,
  };
}

export * from "./types";
export * from "./config";
export { scoreToRiskLevel, RISK_LEVEL_COLORS } from "./level";
export { ACTION_LABELS } from "./action";
