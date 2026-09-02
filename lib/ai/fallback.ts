// ============================================================================
// RiskShield AI — Deterministic Fallback Analyst
// ----------------------------------------------------------------------------
// This is what runs when no AI provider is configured, or when the
// configured provider fails for any reason (network error, bad key, rate
// limit, etc). It is built entirely from the same structured risk-factor
// data the LLM would have received — so the *content* is trustworthy even
// though the *prose* is templated rather than generative.
//
// This is what makes the acceptance criterion "AI fallback works without an
// API key" true: the demo never breaks because a key is missing.
// ============================================================================

import type { TransactionAIContext, AIInvestigationSummary, AnalystAnswer } from "./types";

export function buildFallbackInvestigationSummary(
  ctx: TransactionAIContext
): AIInvestigationSummary {
  const topFactors = ctx.riskFactors.slice(0, 5);

  const riskSummary =
    ctx.riskLevel === "LOW"
      ? `Transaction ${ctx.transactionRef} (₹${ctx.amount.toLocaleString()} at ${ctx.merchantName}) shows no significant risk indicators. The blended risk score is ${ctx.finalScore}/100.`
      : `Transaction ${ctx.transactionRef} (₹${ctx.amount.toLocaleString()} at ${ctx.merchantName}) was flagged ${ctx.riskLevel} with a blended score of ${ctx.finalScore}/100 (rule engine: ${ctx.ruleScore}, ML anomaly model: ${ctx.mlAnomalyScore}).`;

  const whyItIsSuspicious =
    topFactors.length > 0
      ? topFactors.map((f) => `${f.description} (impact: +${f.impact} points)`)
      : ["No individual risk factor crossed the reporting threshold for this transaction."];

  const evidence = [
    `Observed: transaction amount is ₹${ctx.amount.toLocaleString()}, compared to a historical average of ₹${Math.round(
      ctx.historicalAvgAmount
    ).toLocaleString()} for this customer.`,
    `Observed: ${ctx.failedAttempts} failed attempt(s) and ${ctx.transactionsLast10Min} transaction(s) in the last 10 minutes.`,
    `Observed: device is ${ctx.isNewDevice ? "new to this customer" : "previously seen"}; location is ${
      ctx.isNewLocation ? "new to this customer" : "previously seen"
    } (${ctx.location}).`,
    `Observed: account is ${ctx.accountAgeDays} day(s) old.`,
  ];

  const confidence: AIInvestigationSummary["confidence"] =
    ctx.riskFactors.length >= 3 ? "high" : ctx.riskFactors.length >= 1 ? "medium" : "low";

  return {
    riskSummary,
    whyItIsSuspicious,
    evidence,
    recommendedAction: ctx.recommendedAction,
    actionRationale: ctx.actionReason,
    confidence,
    source: "fallback_template",
    disclaimer:
      "This is a rule-based recommendation, not a decision. AI analysis is temporarily unavailable, showing deterministic risk analysis instead. A human reviewer must make the final call.",
  };
}

export function buildFallbackAnalystAnswer(question: string, contextSummary: string): AnalystAnswer {
  return {
    answer: `AI analysis is temporarily unavailable, so here is the underlying data directly:\n\n${contextSummary}\n\n(Ask about a specific transaction ID like "TXN-100045", or try "show highest risk transactions today" / "what are the major risk patterns".)`,
    source: "fallback_template",
  };
}
