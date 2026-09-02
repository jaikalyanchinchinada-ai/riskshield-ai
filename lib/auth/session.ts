// ============================================================================
// RiskShield AI — Session Management
// ----------------------------------------------------------------------------
// A deliberately simple, self-contained session system: a signed JSON Web
// Token stored in an HTTP-only cookie. No external auth service, no database
// session table to manage — the token itself carries the analyst's identity.
//
// We use the `jose` library (not `jsonwebtoken`) specifically because `jose`
// works in the Edge Runtime, which is what Next.js middleware runs on. This
// is what lets middleware.ts check "is this person logged in?" on every
// request before a protected page even starts rendering.
// ============================================================================

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "riskshield_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a long random string for AUTH_SECRET in your .env file."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

/** Returns the decoded session payload, or null if the token is missing,
 *  expired, or has been tampered with. Never throws — callers can always
 *  treat null as "not logged in". */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.name === "string" &&
      typeof payload.email === "string" &&
      typeof payload.role === "string"
    ) {
      return {
        userId: payload.userId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}
