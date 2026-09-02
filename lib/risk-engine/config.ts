// ============================================================================
// RiskShield AI — Risk Engine Configuration
// ----------------------------------------------------------------------------
// All the "tuning knobs" for the risk engine live in this one file on purpose.
// A real risk team would adjust these numbers as fraud patterns change,
// without ever touching a UI component or an API route. Nothing about
// scoring is hard-coded inside React components.
// ============================================================================

/** Maximum points each category can contribute. These must add up to 100. */
export const CATEGORY_MAX_POINTS = {
  amount_anomaly: 20,
  velocity_risk: 20,
  device_risk: 15,
  location_risk: 15,
  failed_attempt_risk: 10,
  account_risk: 10,
  behavioral_anomaly: 10,
} as const;

/** How much weight the explainable rule engine vs. the ML anomaly model gets
 *  in the final blended score. Must add up to 1. */
export const BLEND_WEIGHTS = {
  rule: 0.6,
  ml: 0.4,
} as const;

/** Score boundaries that map a 0-100 score to a human-readable risk level. */
export const RISK_LEVEL_THRESHOLDS: { level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; min: number; max: number }[] = [
  { level: "LOW", min: 0, max: 29 },
  { level: "MEDIUM", min: 30, max: 59 },
  { level: "HIGH", min: 60, max: 79 },
  { level: "CRITICAL", min: 80, max: 100 },
];

/** Thresholds used inside individual rule calculations. Tweak freely. */
export const RULE_THRESHOLDS = {
  amount: {
    // amount / historicalAvgAmount ratio breakpoints
    safeRatio: 1.5,
    moderateRatio: 3,
    highRatio: 6,
    severeRatio: 10,
    noHistoryFlatPoints: 5, // when we have no history to compare against
    noHistoryMinAmount: 5000, // only apply the flat point above this amount
  },
  velocity: {
    tenMinPointsPerExtraTxn: 4, // points per transaction beyond the first, in 10 minutes
    tenMinCap: 15,
    dayCountHighThreshold: 10,
    dayCountMediumThreshold: 6,
    dayCountLowThreshold: 3,
    dayHighPoints: 5,
    dayMediumPoints: 3,
    dayLowPoints: 1,
  },
  device: {
    newDeviceBasePoints: 12,
    freshDeviceAgeDays: 1,
    freshDeviceBonusPoints: 3,
  },
  location: {
    newLocationBasePoints: 10,
    mismatchBonusPoints: 5,
  },
  failedAttempts: {
    pointsPerAttempt: 2,
    cap: 10,
  },
  account: {
    veryNewDays: 1,
    veryNewPoints: 10,
    newDays: 7,
    newPoints: 7,
    recentDays: 30,
    recentPoints: 4,
    establishedDays: 90,
    establishedPoints: 2,
  },
  behavioral: {
    // Compound-signal detection: counts how many "flags" are true at once
    highRatioFlagThreshold: 3, // amount ratio above this counts as a flag
    failedAttemptsFlagThreshold: 3,
    threeFlagsPoints: 10,
    twoFlagsPoints: 5,
  },
} as const;

/** Action engine thresholds — action depends on risk level AND on which
 *  specific factors fired, not the score alone. */
export const ACTION_THRESHOLDS = {
  lowSingleFactorEscalation: 8, // a single strong factor even in a LOW bucket
  mediumAcuteVelocity: 15,
  mediumAcuteFailedAttempts: 8,
  highTakeoverDeviceLocationMin: 10,
  highTakeoverFailedAttempts: 5,
  criticalAutoBlockRuleScore: 80, // below this, a CRITICAL case goes to manual review instead of auto-block
} as const;
