// ============================================================================
// RiskShield AI — Password Hashing
// ----------------------------------------------------------------------------
// Uses bcryptjs (a pure-JavaScript implementation of bcrypt) rather than the
// native `bcrypt` package, on purpose: native bcrypt needs to be compiled
// for your exact machine/OS, which is a common source of install failures
// for students on Windows. bcryptjs is slightly slower but has zero native
// dependencies and just works everywhere.
// ============================================================================

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainTextPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hash);
}
