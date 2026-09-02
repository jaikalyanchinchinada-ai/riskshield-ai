import { NextRequest, NextResponse } from "next/server";
import { listCases } from "@/lib/database/cases";
import { caseListQuerySchema } from "@/lib/utils/validation";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = caseListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const result = await listCases(query);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
