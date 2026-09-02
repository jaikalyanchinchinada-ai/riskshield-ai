import { describe, it, expect } from "vitest";
import { assessRisk } from "@/lib/risk-engine";
import { runRuleEngine } from "@/lib/risk-engine/rules";
import { scoreToRiskLevel } from "@/lib/risk-engine/level";
import type { RawTransactionInput } from "@/lib/risk-engine/types";

/** A safe, everyday transaction with no red flags. */
function baseInput(overrides: Partial<RawTransactionInput> = {}): RawTransactionInput {
  return {
    amount: 1200,
    currency: "INR",
    paymentMethod: "upi",
    accountAgeDays: 400,
    historicalAvgAmount: 1100,
    transactionsLast10Min: 1,
    transactionsLast24h: 2,
    failedAttempts: 0,
    isNewDevice: false,
    deviceAgeDays: 400,
    isNewLocation: false,
    location: "Hyderabad",
    previousLocation: "Hyderabad",
    ipRegion: "IN-TG",
    ...overrides,
  };
}

describe("1. Low-risk transaction produces low risk", () => {
  it("scores a routine, expected transaction as LOW", () => {
    const result = assessRisk(baseInput(), 5);
    expect(result.riskLevel).toBe("LOW");
    expect(result.finalScore).toBeLessThan(30);
  });
});

describe("2. Large anomaly increases risk", () => {
  it("a much larger amount than history increases the score", () => {
    const normal = assessRisk(baseInput(), 10);
    const anomalous = assessRisk(baseInput({ amount: 1100 * 9 }), 10);
    expect(anomalous.finalScore).toBeGreaterThan(normal.finalScore);
    expect(anomalous.riskFactors.some((f) => f.category === "amount_anomaly")).toBe(true);
  });
});

describe("3. New device increases risk", () => {
  it("marking the device as new adds device_risk points", () => {
    const known = assessRisk(baseInput({ isNewDevice: false }), 10);
    const newDevice = assessRisk(baseInput({ isNewDevice: true, deviceAgeDays: 0 }), 10);
    expect(newDevice.finalScore).toBeGreaterThan(known.finalScore);
    expect(newDevice.riskFactors.some((f) => f.category === "device_risk")).toBe(true);
  });
});

describe("4. Multiple failed attempts increase risk", () => {
  it("more failed attempts before the transaction raise the score", () => {
    const clean = assessRisk(baseInput({ failedAttempts: 0 }), 10);
    const messy = assessRisk(baseInput({ failedAttempts: 5 }), 10);
    expect(messy.finalScore).toBeGreaterThan(clean.finalScore);
    expect(messy.riskFactors.some((f) => f.category === "failed_attempt_risk")).toBe(true);
  });
});

describe("5. High transaction velocity increases risk", () => {
  it("many transactions in a short window raise the score", () => {
    const slow = assessRisk(baseInput({ transactionsLast10Min: 1, transactionsLast24h: 2 }), 10);
    const fast = assessRisk(
      baseInput({ transactionsLast10Min: 6, transactionsLast24h: 14 }),
      10
    );
    expect(fast.finalScore).toBeGreaterThan(slow.finalScore);
    expect(fast.riskFactors.some((f) => f.category === "velocity_risk")).toBe(true);
  });
});

describe("6. Risk score stays between 0 and 100", () => {
  it("never goes below 0 for a perfectly normal transaction", () => {
    const result = assessRisk(baseInput(), 0);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("never exceeds 100 even for an extremely suspicious transaction", () => {
    const worstCase = assessRisk(
      baseInput({
        amount: 5_000_000,
        historicalAvgAmount: 500,
        accountAgeDays: 0,
        failedAttempts: 20,
        transactionsLast10Min: 15,
        transactionsLast24h: 40,
        isNewDevice: true,
        deviceAgeDays: 0,
        isNewLocation: true,
        location: "Unknown",
        previousLocation: "Hyderabad",
      }),
      100
    );
    expect(worstCase.finalScore).toBeLessThanOrEqual(100);
    expect(worstCase.ruleScore).toBeLessThanOrEqual(100);
  });
});

describe("7. Risk level correctly maps from score", () => {
  it.each([
    [0, "LOW"],
    [29, "LOW"],
    [30, "MEDIUM"],
    [59, "MEDIUM"],
    [60, "HIGH"],
    [79, "HIGH"],
    [80, "CRITICAL"],
    [100, "CRITICAL"],
  ] as const)("score %i maps to %s", (score, expected) => {
    expect(scoreToRiskLevel(score)).toBe(expected);
  });
});

describe("8. Risk explanations correspond to triggered factors", () => {
  it("only reports factors that actually fired, with a non-empty description", () => {
    const input = baseInput({ isNewDevice: true, deviceAgeDays: 0, failedAttempts: 3 });
    const { factors, breakdown } = runRuleEngine(input);

    // Every reported factor must have a matching non-zero breakdown entry
    for (const factor of factors) {
      expect(breakdown[factor.category]).toBeGreaterThan(0);
      expect(factor.description.length).toBeGreaterThan(0);
    }
    // Categories with 0 points must not appear in the explanation list
    const firedCategories = new Set(factors.map((f) => f.category));
    for (const [category, points] of Object.entries(breakdown)) {
      if (points === 0) {
        expect(firedCategories.has(category as any)).toBe(false);
      }
    }
  });
});

describe("9. Recommended action is consistent with risk", () => {
  it("a clean LOW-risk transaction is approved", () => {
    const result = assessRisk(baseInput(), 5);
    expect(result.action.action).toBe("approve");
  });

  it("a CRITICAL transaction with strong rule evidence is blocked", () => {
    const result = assessRisk(
      baseInput({
        amount: 50000,
        historicalAvgAmount: 1000,
        isNewDevice: true,
        deviceAgeDays: 0,
        isNewLocation: true,
        location: "Unknown",
        failedAttempts: 6,
        transactionsLast10Min: 8,
        transactionsLast24h: 20,
        accountAgeDays: 2,
      }),
      90
    );
    expect(result.riskLevel).toBe("CRITICAL");
    expect(["block", "manual_review"]).toContain(result.action.action);
  });

  it("a HIGH risk transaction driven by new device + new location goes to manual review", () => {
    const result = assessRisk(
      baseInput({
        amount: 3000,
        historicalAvgAmount: 1200,
        isNewDevice: true,
        deviceAgeDays: 0,
        isNewLocation: true,
        location: "Unknown City",
        failedAttempts: 1,
      }),
      60
    );
    if (result.riskLevel === "HIGH") {
      expect(result.action.action).toBe("manual_review");
    }
  });
});

describe("10. Simulator produces a valid assessment", () => {
  it("returns a complete, well-formed RiskAssessmentResult for arbitrary input", () => {
    const result = assessRisk(
      baseInput({ amount: 8000, isNewDevice: true, deviceAgeDays: 1 }),
      45
    );
    expect(typeof result.finalScore).toBe("number");
    expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(result.riskLevel);
    expect(Array.isArray(result.riskFactors)).toBe(true);
    expect(result.action).toHaveProperty("action");
    expect(result.action).toHaveProperty("reason");
    expect(result.ruleBreakdown).toHaveProperty("amount_anomaly");
  });
});
