// ============================================================================
// RiskShield AI — Database Client
// ----------------------------------------------------------------------------
// Standard Prisma + Next.js singleton pattern: in development, Next.js hot
// reloads modules on every file save, which would otherwise create a new
// PrismaClient (and a new DB connection pool) on every reload. We stash the
// client on `globalThis` so it survives hot reloads.
// ============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
