import { NextRequest, NextResponse } from "next/server";
import { getTransactionByRef, getCustomerRecentTransactions } from "@/lib/database/transactions";
import { apiError, handleApiError } from "@/lib/utils/api-error";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const transaction = await getTransactionByRef(params.id);
    if (!transaction) return apiError("Transaction not found", 404);

    const history = await getCustomerRecentTransactions(transaction.customerId, transaction.id, 5);

    return NextResponse.json({ transaction, history });
  } catch (err) {
    return handleApiError(err);
  }
}
