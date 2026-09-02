import { describe, it, expect } from "vitest";
import {
  simulatorInputSchema,
  transactionListQuerySchema,
  caseActionSchema,
  caseNoteSchema,
  caseListQuerySchema,
  analystQuestionSchema,
} from "@/lib/utils/validation";

describe("simulatorInputSchema", () => {
  it("accepts a well-formed simulator request", () => {
    const result = simulatorInputSchema.safeParse({
      amount: 5000,
      location: "Hyderabad",
      device: "DEV-1",
      isNewDevice: true,
      failedAttempts: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative amount", () => {
    const result = simulatorInputSchema.safeParse({ amount: -100, location: "X", device: "D" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing required field (location)", () => {
    const result = simulatorInputSchema.safeParse({ amount: 100, device: "D" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid payment method", () => {
    const result = simulatorInputSchema.safeParse({
      amount: 100,
      location: "X",
      device: "D",
      paymentMethod: "cryptocurrency",
    });
    expect(result.success).toBe(false);
  });

  it("applies sensible defaults when optional fields are omitted", () => {
    const result = simulatorInputSchema.parse({ amount: 100, location: "X", device: "D" });
    expect(result.paymentMethod).toBe("upi");
    expect(result.failedAttempts).toBe(0);
    expect(result.isNewDevice).toBe(false);
  });

  it("rejects an unreasonably large amount (bounds check)", () => {
    const result = simulatorInputSchema.safeParse({ amount: 999_999_999_999, location: "X", device: "D" });
    expect(result.success).toBe(false);
  });
});

describe("transactionListQuerySchema", () => {
  it("coerces string query params into numbers", () => {
    const result = transactionListQuerySchema.parse({ page: "2", pageSize: "50" });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
  });

  it("rejects a risk level outside the known set", () => {
    const result = transactionListQuerySchema.safeParse({ riskLevel: "EXTREME" });
    expect(result.success).toBe(false);
  });

  it("caps page size at the maximum to prevent unbounded queries", () => {
    const result = transactionListQuerySchema.safeParse({ pageSize: "10000" });
    expect(result.success).toBe(false);
  });

  it("defaults to page 1 when not provided", () => {
    const result = transactionListQuerySchema.parse({});
    expect(result.page).toBe(1);
  });
});

describe("caseListQuerySchema", () => {
  it("rejects an invalid status value", () => {
    const result = caseListQuerySchema.safeParse({ status: "archived" });
    expect(result.success).toBe(false);
  });
  it("accepts a valid status value", () => {
    const result = caseListQuerySchema.safeParse({ status: "escalated" });
    expect(result.success).toBe(true);
  });
});

describe("caseActionSchema", () => {
  it("accepts each of the five documented review actions", () => {
    for (const action of ["approve", "block", "escalate", "verify", "false_positive"]) {
      const result = caseActionSchema.safeParse({ action });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unknown action", () => {
    const result = caseActionSchema.safeParse({ action: "delete_forever" });
    expect(result.success).toBe(false);
  });

  it("defaults analystName to 'Demo Analyst' when omitted", () => {
    const result = caseActionSchema.parse({ action: "approve" });
    expect(result.analystName).toBe("Demo Analyst");
  });
});

describe("caseNoteSchema", () => {
  it("rejects an empty note", () => {
    const result = caseNoteSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a note that exceeds the max length", () => {
    const result = caseNoteSchema.safeParse({ content: "x".repeat(5000) });
    expect(result.success).toBe(false);
  });

  it("accepts a normal note", () => {
    const result = caseNoteSchema.safeParse({ content: "Verified via OTP challenge." });
    expect(result.success).toBe(true);
  });
});

describe("analystQuestionSchema", () => {
  it("rejects an empty question", () => {
    expect(analystQuestionSchema.safeParse({ question: "" }).success).toBe(false);
  });
  it("accepts a normal question", () => {
    expect(analystQuestionSchema.safeParse({ question: "Why was TXN-100045 flagged?" }).success).toBe(true);
  });
});
