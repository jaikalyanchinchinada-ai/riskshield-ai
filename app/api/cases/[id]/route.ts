import { NextRequest, NextResponse } from "next/server";
import { getCaseByRef, updateCaseStatus } from "@/lib/database/cases";
import { caseUpdateSchema } from "@/lib/utils/validation";
import { apiError, handleApiError } from "@/lib/utils/api-error";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const caseRecord = await getCaseByRef(params.id);
    if (!caseRecord) return apiError("Case not found", 404);
    return NextResponse.json(caseRecord);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = caseUpdateSchema.parse(body);

    const updated = await updateCaseStatus(params.id, {
      status: input.status,
      reason: input.reason,
      analystName: input.assignedAnalystName,
    });
    if (!updated) return apiError("Case not found", 404);

    const full = await getCaseByRef(params.id);
    return NextResponse.json(full);
  } catch (err) {
    return handleApiError(err);
  }
}
