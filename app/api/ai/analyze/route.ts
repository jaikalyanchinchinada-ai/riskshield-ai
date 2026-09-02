import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/client";
import { getTransactionByRef } from "@/lib/database/transactions";
import { analyzeTransactionWithAI } from "@/lib/ai/analyst";
import { aiAnalyzeSchema } from "@/lib/utils/validation";
import { apiError, handleApiError } from "@/lib/utils/api-error";
import type { TransactionAIContext } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { transactionRef } = aiAnalyzeSchema.parse(body);

    const transaction = await getTransactionByRef(transactionRef);
    if (!transaction) return apiError("Transaction not found", 404);
    if (!transaction.riskAssessment) {
      return apiError(
        "This transaction has not been risk-assessed yet. Run analysis first.",
        409
      );
    }

    const ctx: TransactionAIContext = {
      transactionRef: transaction.transactionRef,
      amount: transaction.amount,
      currency: transaction.currency,
      merchantName: transaction.merchantName,
      paymentMethod: transaction.paymentMethod,
      timestamp: transaction.timestamp.toISOString(),
      customerRef: transaction.customer.customerRef,
      accountAgeDays: transaction.accountAgeDays,
      historicalAvgAmount: transaction.historicalAvgAmount,
      location: transaction.location,
      previousLocation: transaction.previousLocation,
      isNewDevice: transaction.isNewDevice,
      isNewLocation: transaction.isNewLocation,
      failedAttempts: transaction.failedAttempts,
      transactionsLast10Min: transaction.transactionsLast10Min,
      transactionsLast24h: transaction.transactionsLast24h,
      ruleScore: transaction.riskAssessment.ruleScore,
      mlAnomalyScore: transaction.riskAssessment.mlAnomalyScore,
      finalScore: transaction.riskAssessment.finalScore,
      riskLevel: transaction.riskAssessment.riskLevel as any,
      riskFactors: transaction.riskAssessment.riskFactors as any,
      recommendedAction: transaction.riskAssessment.recommendedAction as any,
      actionReason: transaction.riskAssessment.actionReason,
    };

    const summary = await analyzeTransactionWithAI(ctx);

    // Persist a compact copy of the summary on the case (if one exists) and log the action.
    if (transaction.riskAssessment.case) {
      await prisma.case.update({
        where: { id: transaction.riskAssessment.case.id },
        data: { aiSummary: summary.riskSummary },
      });
      await prisma.auditLog.create({
        data: {
          caseId: transaction.riskAssessment.case.id,
          analystName: "Demo Analyst",
          action: "ai_analysis_run",
          aiRecommendation: `${summary.recommendedAction}: ${summary.actionRationale}`,
        },
      });
    }

    return NextResponse.json(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
