import { NextRequest, NextResponse } from "next/server";
import { listAuditLog } from "@/lib/database/audit";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const caseId = searchParams.get("caseId") ?? undefined;

    const result = await listAuditLog({ page, pageSize, caseId });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
