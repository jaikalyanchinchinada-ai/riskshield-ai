import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/database/analytics";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
