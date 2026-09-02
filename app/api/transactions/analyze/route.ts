import { NextRequest, NextResponse } from "next/server";
import { getTransactionByRef, saveRiskAssessment, toRawInput } from "@/lib/database/transactions";
import { ensureCaseForAssessment } from "@/lib/database/cases";
import { getMlAnomalyScore } from "@/lib/ml/anomaly";
import { assessRisk } from "@/lib/risk-engine";
import { transactionAnalyzeSchema } from "@/lib/utils/validation";
import { apiError, handleApiError } from "@/lib/utils/api-error";

/** Re-runs the deterministic rule engine + ML model for an existing, stored
 *  transaction and persists the refreshed assessment. Useful after changing
 *  risk engine configuration, or to backfill a transaction that was created
 *  without one. This does NOT create a new transaction — for ad-hoc "what if"
 *  transactions that don't exist in the database, use /api/simulator/analyze. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { transactionRef } = transactionAnalyzeSchema.parse(body);

    const transaction = await getTransactionByRef(transactionRef);
    if (!transaction) return apiError("Transaction not found", 404);

    const rawInput = toRawInput(transaction);
    const ml = await getMlAnomalyScore(rawInput);
    const result = assessRisk(rawInput, ml.score);

    const saved = await saveRiskAssessment(transaction.id, result);

    if (result.action.action !== "approve") {
      await ensureCaseForAssessment(
        transaction.id,
        saved.id,
        result.riskLevel,
        result.riskFactors[0]?.description ?? result.action.reason
      );
    }

    return NextResponse.json({
      transactionRef,
      assessment: result,
      mlSource: ml.source,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
