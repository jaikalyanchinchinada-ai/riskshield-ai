import { NextRequest, NextResponse } from "next/server";
import { addCaseNote, getCaseByRef } from "@/lib/database/cases";
import { caseNoteSchema } from "@/lib/utils/validation";
import { apiError, handleApiError } from "@/lib/utils/api-error";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = caseNoteSchema.parse(body);

    const note = await addCaseNote(params.id, input);
    if (!note) return apiError("Case not found", 404);

    const full = await getCaseByRef(params.id);
    return NextResponse.json({ note, case: full }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
