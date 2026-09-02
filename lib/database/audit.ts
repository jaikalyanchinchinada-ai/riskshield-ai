// ============================================================================
// RiskShield AI — Audit Log Queries
// ============================================================================

import { prisma } from "./client";

export async function listAuditLog(filters: { page: number; pageSize: number; caseId?: string }) {
  const { page, pageSize, caseId } = filters;
  const where = caseId ? { caseId } : {};

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { case: { include: { transaction: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
