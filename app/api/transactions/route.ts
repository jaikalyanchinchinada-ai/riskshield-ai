import { NextRequest, NextResponse } from "next/server";
import { listTransactions } from "@/lib/database/transactions";
import { transactionListQuerySchema } from "@/lib/utils/validation";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = transactionListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      riskLevel: searchParams.get("riskLevel") ?? undefined,
      paymentMethod: searchParams.get("paymentMethod") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });

    const result = await listTransactions(query);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
