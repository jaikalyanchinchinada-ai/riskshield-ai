import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/client";
import { answerAnalystQuestion } from "@/lib/ai/analyst";
import { analystQuestionSchema } from "@/lib/utils/validation";
import { handleApiError } from "@/lib/utils/api-error";
import { getDashboardSummary, getTopRiskFactors } from "@/lib/database/analytics";
import { formatCurrency } from "@/lib/utils/format";

/** Looks at the analyst's question and gathers the most relevant structured
 *  data from the database to ground the AI's (or the fallback template's)
 *  answer. This is intentionally simple keyword matching, not another LLM
 *  call — it keeps the "what data can the AI see" step fully deterministic
 *  and auditable. */
async function buildContextSummary(question: string): Promise<string> {
  const q = question.toLowerCase();
  const txnMatch = question.match(/TXN-\d+/i);
  const custMatch = question.match(/CUST-\d+/i);

  if (txnMatch) {
    const ref = txnMatch[0].toUpperCase();
    const txn = await prisma.transaction.findUnique({
      where: { transactionRef: ref },
      include: { customer: true, riskAssessment: { include: { riskFactors: true } } },
    });
    if (!txn) return `No transaction found with reference ${ref}.`;
    if (!txn.riskAssessment) return `Transaction ${ref} exists but has not been risk-assessed yet.`;

    const factors = txn.riskAssessment.riskFactors
      .sort((a: { impact: number }, b: { impact: number }) => b.impact - a.impact)
      .map((f: { description: string; impact: number; category: string }) => `- ${f.description} (+${f.impact} pts, ${f.category})`)
      .join("\n");

    return [
      `Transaction ${ref}: ${formatCurrency(txn.amount, txn.currency)} at ${txn.merchantName}, customer ${txn.customer.customerRef}.`,
      `Risk score: ${txn.riskAssessment.finalScore}/100 (${txn.riskAssessment.riskLevel}). Rule score: ${txn.riskAssessment.ruleScore}, ML anomaly score: ${txn.riskAssessment.mlAnomalyScore}.`,
      `Recommended action: ${txn.riskAssessment.recommendedAction} — ${txn.riskAssessment.actionReason}`,
      `Risk factors:\n${factors || "(none triggered)"}`,
    ].join("\n");
  }

  if (custMatch) {
    const ref = custMatch[0].toUpperCase();
    const customer = await prisma.customer.findUnique({ where: { customerRef: ref } });
    if (!customer) return `No customer found with reference ${ref}.`;
    const txns = await prisma.transaction.findMany({
      where: { customerId: customer.id },
      include: { riskAssessment: true },
      orderBy: { timestamp: "desc" },
      take: 15,
    });
    const avgScore =
      txns.filter((t: { riskAssessment: { finalScore: number } | null }) => t.riskAssessment).reduce(
        (s: number, t: { riskAssessment: { finalScore: number } | null }) => s + (t.riskAssessment?.finalScore ?? 0),
        0
      ) / (txns.filter((t: { riskAssessment: unknown }) => t.riskAssessment).length || 1);
    const flagged = txns.filter(
      (t: { riskAssessment: { riskLevel: string } | null }) =>
        t.riskAssessment && ["HIGH", "CRITICAL"].includes(t.riskAssessment.riskLevel)
    );
    return [
      `Customer ${ref}: account age ${customer.accountAgeDays} days, home location ${customer.homeLocation}.`,
      `Last ${txns.length} transactions: average risk score ${avgScore.toFixed(1)}/100.`,
      `${flagged.length} of the last ${txns.length} transactions were HIGH or CRITICAL risk.`,
      flagged.length
        ? `Flagged transactions: ${flagged.map((t: { transactionRef: string }) => t.transactionRef).join(", ")}`
        : "No recent flagged transactions.",
    ].join("\n");
  }

  if (q.includes("pattern") || q.includes("top risk factor")) {
    const factors = await getTopRiskFactors(7);
    return [
      "Top risk factor categories across all assessed transactions (by frequency):",
      ...factors.map((f) => `- ${f.category}: triggered ${f.count} times, average impact ${f.avgImpact} points`),
    ].join("\n");
  }

  if (q.includes("highest") || q.includes("high risk") || q.includes("high-risk") || q.includes("today")) {
    const summary = await getDashboardSummary();
    return [
      `${summary.highRiskCount} HIGH-risk and ${summary.criticalRiskCount} CRITICAL-risk transactions out of ${summary.transactionsAnalyzed} analyzed.`,
      "Most recent high/critical risk transactions:",
      ...summary.recentHighRisk.map(
        (t: {
          transactionRef: string;
          amount: number;
          currency: string;
          riskAssessment: { finalScore: number; riskLevel: string; riskFactors: { description: string }[] } | null;
        }) =>
          `- ${t.transactionRef}: ${formatCurrency(t.amount, t.currency)}, score ${t.riskAssessment?.finalScore}/100 (${t.riskAssessment?.riskLevel}), top factor: ${
            t.riskAssessment?.riskFactors[0]?.description ?? "n/a"
          }`
      ),
    ].join("\n");
  }

  // Default: general dashboard snapshot
  const summary = await getDashboardSummary();
  return [
    `Total transactions: ${summary.totalTransactions}, analyzed: ${summary.transactionsAnalyzed}.`,
    `Risk distribution: ${summary.riskDistribution.map((d) => `${d.level}=${d.count}`).join(", ")}.`,
    `Average risk score: ${summary.averageRiskScore}/100. Anomaly rate: ${summary.anomalyRatePct}%.`,
    `Open review queue: ${summary.reviewQueueCount} cases.`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { question } = analystQuestionSchema.parse(body);

    const contextSummary = await buildContextSummary(question);
    const result = await answerAnalystQuestion(question, contextSummary);

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
