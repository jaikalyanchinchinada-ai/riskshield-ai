// ============================================================================
// RiskShield AI — Case Queries (Human Review Queue)
// ============================================================================

import { prisma } from "./client";
import { nextRef } from "@/lib/utils/ids";
import type { Prisma } from "@prisma/client";
import type { RiskLevel } from "@/lib/risk-engine/types";

export interface CaseListFilters {
  page: number;
  pageSize: number;
  status?: string;
  priority?: string;
  search?: string;
}

export async function listCases(filters: CaseListFilters) {
  const { page, pageSize, status, priority, search } = filters;
  const where: Prisma.CaseWhereInput = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { caseRef: { contains: search, mode: "insensitive" } },
      { transaction: { transactionRef: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        transaction: { include: { customer: true } },
        riskAssessment: {
          include: { riskFactors: { orderBy: { impact: "desc" }, take: 1 } },
        },
        assignedAnalyst: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.case.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCaseByRef(caseRef: string) {
  return prisma.case.findUnique({
    where: { caseRef },
    include: {
      transaction: { include: { customer: true, device: true } },
      riskAssessment: { include: { riskFactors: { orderBy: { impact: "desc" } } } },
      assignedAnalyst: { select: { id: true, name: true, role: true } },
      notes: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });
}

function mapStatusToAction(status: string): string {
  switch (status) {
    case "escalated":
      return "escalated";
    case "resolved":
      return "approved";
    case "false_positive":
      return "false_positive";
    default:
      return "status_change";
  }
}

export async function updateCaseStatus(
  caseRef: string,
  input: { status?: string; reason?: string; analystName?: string; assignedAnalystName?: string }
) {
  const existing = await prisma.case.findUnique({ where: { caseRef } });
  if (!existing) return null;

  const nextStatus = input.status ?? existing.status;
  const updated = await prisma.case.update({
    where: { caseRef },
    data: {
      status: nextStatus,
      resolvedAt:
        nextStatus === "resolved" || nextStatus === "false_positive" ? new Date() : existing.resolvedAt,
    },
  });

  if (input.status && input.status !== existing.status) {
    await prisma.auditLog.create({
      data: {
        caseId: existing.id,
        analystName: input.analystName ?? "Demo Analyst",
        action: mapStatusToAction(input.status),
        previousStatus: existing.status,
        newStatus: input.status,
        reason: input.reason ?? null,
      },
    });
  }

  return updated;
}

const ACTION_TO_STATUS: Record<string, string> = {
  approve: "resolved",
  block: "resolved",
  escalate: "escalated",
  verify: "investigating",
  false_positive: "false_positive",
  reopen: "open",
};

const ACTION_REASON_DEFAULT: Record<string, string> = {
  approve: "Reviewed and approved by analyst.",
  block: "Reviewed and blocked by analyst.",
  escalate: "Escalated to senior review.",
  verify: "Verification requested from customer.",
  false_positive: "Marked as a false positive after review.",
  reopen: "Case reopened for further review.",
};

/** Applies one of the explicit review-queue actions (Approve, Escalate,
 *  Request Verification, Block, Mark False Positive) to a case: updates its
 *  status and writes a precisely-labelled audit log entry in one step. */
export async function applyCaseAction(
  caseRef: string,
  input: { action: string; reason?: string; analystName: string }
) {
  const existing = await prisma.case.findUnique({ where: { caseRef } });
  if (!existing) return null;

  const nextStatus = ACTION_TO_STATUS[input.action] ?? existing.status;

  const updated = await prisma.case.update({
    where: { caseRef },
    data: {
      status: nextStatus,
      resolvedAt: nextStatus === "resolved" || nextStatus === "false_positive" ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      caseId: existing.id,
      analystName: input.analystName,
      action: input.action,
      previousStatus: existing.status,
      newStatus: nextStatus,
      reason: input.reason || ACTION_REASON_DEFAULT[input.action] || null,
    },
  });

  return updated;
}

export async function addCaseNote(caseRef: string, input: { content: string; authorName: string }) {
  const existing = await prisma.case.findUnique({ where: { caseRef } });
  if (!existing) return null;

  const note = await prisma.caseNote.create({
    data: { caseId: existing.id, content: input.content, authorName: input.authorName },
  });

  await prisma.auditLog.create({
    data: {
      caseId: existing.id,
      analystName: input.authorName,
      action: "note_added",
      reason: input.content.slice(0, 300),
    },
  });

  return note;
}

/** Creates a review case for a risk assessment if one doesn't already exist.
 *  Called both by the seed script and by the live re-analysis API route. */
export async function ensureCaseForAssessment(
  transactionId: string,
  riskAssessmentId: string,
  riskLevel: RiskLevel,
  primaryReason: string
) {
  const existing = await prisma.case.findUnique({ where: { transactionId } });
  if (existing) return existing;

  const priority =
    riskLevel === "CRITICAL" ? "critical" : riskLevel === "HIGH" ? "high" : riskLevel === "MEDIUM" ? "medium" : "low";

  const created = await prisma.case.create({
    data: {
      caseRef: nextRef("CASE", 3000),
      transactionId,
      riskAssessmentId,
      status: "open",
      priority,
    },
  });

  await prisma.auditLog.create({
    data: {
      caseId: created.id,
      analystName: "System",
      action: "status_change",
      previousStatus: null,
      newStatus: "open",
      reason: primaryReason,
    },
  });

  return created;
}
