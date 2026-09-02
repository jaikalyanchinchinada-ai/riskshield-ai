// ============================================================================
// RiskShield AI — Risk Engine Types
// ----------------------------------------------------------------------------
// These types describe the "shape" of data that flows through the risk engine.
// Nothing in this file talks to a database — it is pure, plain TypeScript,
// which is what makes the risk engine easy to test and easy to reuse
// (API routes, the seed script, and the Transaction Simulator all use it).
// ============================================================================

/** The raw signals we know about a transaction at the moment it happens. */
export interface RawTransactionInput {
  amount: number;
  currency: string;
  paymentMethod: string;

  // Customer / account context
  accountAgeDays: number;
  historicalAvgAmount: number; // 0 if the customer has no prior history

  // Velocity (how often this customer has transacted recently)
  transactionsLast10Min: number;
  transactionsLast24h: number;
  failedAttempts: number;

  // Device context
  isNewDevice: boolean;
  deviceAgeDays: number;

  // Location context
  isNewLocation: boolean;
  location: string;
  previousLocation?: string | null;
  ipRegion?: string;
}

export type RiskFactorCategory =
  | "amount_anomaly"
  | "velocity_risk"
  | "device_risk"
  | "location_risk"
  | "failed_attempt_risk"
  | "account_risk"
  | "behavioral_anomaly";

export type RiskFactorSeverity = "info" | "low" | "medium" | "high";

/** One explainable line-item behind a score. Impact must trace back to a real, calculated feature. */
export interface RiskFactorResult {
  category: RiskFactorCategory;
  description: string;
  impact: number; // points this factor contributed (>= 0)
  severity: RiskFactorSeverity;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RecommendedAction =
  | "approve"
  | "monitor"
  | "verify"
  | "manual_review"
  | "block";

export interface RuleScoreBreakdown {
  amount_anomaly: number;
  velocity_risk: number;
  device_risk: number;
  location_risk: number;
  failed_attempt_risk: number;
  account_risk: number;
  behavioral_anomaly: number;
}

export interface ActionDecision {
  action: RecommendedAction;
  reason: string;
  supportingFactors: RiskFactorCategory[];
}

/** The full, final output of the risk engine for one transaction. */
export interface RiskAssessmentResult {
  ruleScore: number; // 0-100, from the deterministic weighted rules
  ruleBreakdown: RuleScoreBreakdown;
  mlAnomalyScore: number; // 0-100, from the ML anomaly detector
  finalScore: number; // 0-100, blended score actually used for decisions
  riskLevel: RiskLevel;
  riskFactors: RiskFactorResult[]; // sorted, highest impact first
  action: ActionDecision;
}
