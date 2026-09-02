// ============================================================================
// RiskShield AI — Current User Helper
// ----------------------------------------------------------------------------
// Use this inside Server Components and API Route Handlers to find out who's
// logged in. Uses next/headers, so it only works on the server — which is
// exactly where we want to trust session data anyway.
// ============================================================================

import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./session";

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
