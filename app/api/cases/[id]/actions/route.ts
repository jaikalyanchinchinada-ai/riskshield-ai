import { NextRequest, NextResponse } from "next/server";
import { applyCaseAction, getCaseByRef } from "@/lib/database/cases";
import { caseActionSchema } from "@/lib/utils/validation";
import { apiError, handleApiError } from "@/lib/utils/api-error";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json().catch(() => ({}));
    const input = caseActionSchema.parse(body);

    const updated = await applyCaseAction(params.id, input);
    if (!updated) return apiError("Case not found", 404);

    const full = await getCaseByRef(params.id);
    return NextResponse.json(full);
  } catch (err) {
    return handleApiError(err);
  }
}
