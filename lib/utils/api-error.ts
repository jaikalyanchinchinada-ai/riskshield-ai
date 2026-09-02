// ============================================================================
// RiskShield AI — API Error Helper
// ============================================================================

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: err.flatten() },
      { status: 400 }
    );
  }
  console.error("[api]", err);
  return NextResponse.json(
    { error: "Something went wrong processing your request." },
    { status: 500 }
  );
}
