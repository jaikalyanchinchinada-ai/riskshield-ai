// ============================================================================
// RiskShield AI — Transaction Queries
// ----------------------------------------------------------------------------
// All Prisma queries related to transactions live here, kept out of both the
// API route handlers and any UI component, per the project's separation-of-
// concerns rule.
// ============================================================================

import { prisma } from "./client";
import type { Prisma } from "@prisma/client";
import type { RawTransactionInput, RiskAssessmentResult } from "@/lib/risk-engine/types";

export interface TransactionListFilters {
  page: number;
  pageSize: number;
  search?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listTransactions(filters: TransactionListFilters) {
  const { page, pageSize, search, riskLevel, paymentMethod, dateFrom, dateTo } = filters;

  const where: Prisma.TransactionWhereInput = {};

  if (search) {
    where.OR = [
      { transactionRef: { contains: search, mode: "insensitive" } },
      { merchantId: { contains: search, mode: "insensitive" } },
      { merchantName: { contains: search, mode: "insensitive" } },
      { deviceRefUsed: { contains: search, mode: "insensitive" } },
      { customer: { customerRef: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (dateFrom || dateTo) {
    where.timestamp = {};
    if (dateFrom) (where.timestamp as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) (where.timestamp as Prisma.DateTimeFilter).lte = new Date(dateTo);
  }
  if (riskLevel) {
    where.riskAssessment = { is: { riskLevel } };
  }

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        customer: true,
        riskAssessment: { include: { riskFactors: { orderBy: { impact: "desc" }, take: 1 } } },
      },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTransactionByRef(ref: string) {
  return prisma.transaction.findUnique({
    where: { transactionRef: ref },
    include: {
      customer: true,
      device: true,
      riskAssessment: {
        include: {
          riskFactors: { orderBy: { impact: "desc" } },
          case: true,
        },
      },
    },
  });
}

export async function getCustomerRecentTransactions(
  customerId: string,
  excludeId: string,
  limit = 5
) {
  return prisma.transaction.findMany({
    where: { customerId, NOT: { id: excludeId } },
    orderBy: { timestamp: "desc" },
    take: limit,
    include: { riskAssessment: true },
  });
}

/** Maps a stored (or simulated) transaction's fields into the risk engine's input shape. */
export function toRawInput(t: {
  amount: number;
  historicalAvgAmount: number;
  accountAgeDays: number;
  failedAttempts: number;
  transactionsLast10Min: number;
  transactionsLast24h: number;
  isNewDevice: boolean;
  deviceAgeDays: number;
  isNewLocation: boolean;
  location: string;
  previousLocation?: string | null;
  paymentMethod: string;
  currency: string;
  ipRegion?: string | null;
}): RawTransactionInput {
  return {
    amount: t.amount,
    currency: t.currency,
    paymentMethod: t.paymentMethod,
    accountAgeDays: t.accountAgeDays,
    historicalAvgAmount: t.historicalAvgAmount,
    transactionsLast10Min: t.transactionsLast10Min,
    transactionsLast24h: t.transactionsLast24h,
    failedAttempts: t.failedAttempts,
    isNewDevice: t.isNewDevice,
    deviceAgeDays: t.deviceAgeDays,
    isNewLocation: t.isNewLocation,
    location: t.location,
    previousLocation: t.previousLocation ?? null,
    ipRegion: t.ipRegion ?? undefined,
  };
}

/** Persists (creates or replaces) the risk assessment + factors for a transaction. */
export async function saveRiskAssessment(
  transactionId: string,
  result: RiskAssessmentResult,
  modelVersion = "v1"
) {
  return prisma.riskAssessment.upsert({
    where: { transactionId },
    create: {
      transactionId,
      ruleScore: result.ruleScore,
      mlAnomalyScore: result.mlAnomalyScore,
      finalScore: result.finalScore,
      riskLevel: result.riskLevel,
      recommendedAction: result.action.action,
      actionReason: result.action.reason,
      modelVersion,
      riskFactors: {
        create: result.riskFactors.map((f) => ({
          category: f.category,
          description: f.description,
          impact: f.impact,
          severity: f.severity,
        })),
      },
    },
    update: {
      ruleScore: result.ruleScore,
      mlAnomalyScore: result.mlAnomalyScore,
      finalScore: result.finalScore,
      riskLevel: result.riskLevel,
      recommendedAction: result.action.action,
      actionReason: result.action.reason,
      modelVersion,
      riskFactors: {
        deleteMany: {},
        create: result.riskFactors.map((f) => ({
          category: f.category,
          description: f.description,
          impact: f.impact,
          severity: f.severity,
        })),
      },
    },
    include: { riskFactors: true },
  });
}
