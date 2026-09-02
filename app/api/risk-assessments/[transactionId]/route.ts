import { NextRequest, NextResponse } from "next/server";
import { getTransactionByRef } from "@/lib/database/transactions";
import { apiError, handleApiError } from "@/lib/utils/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const transaction = await getTransactionByRef(params.transactionId);
    if (!transaction || !transaction.riskAssessment) {
      return apiError("No risk assessment found for this transaction", 404);
    }
    return NextResponse.json(transaction.riskAssessment);
  } catch (err) {
    return handleApiError(err);
  }
}
