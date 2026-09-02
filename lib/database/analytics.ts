// ============================================================================
// RiskShield AI — Analytics & Dashboard Queries
// ----------------------------------------------------------------------------
// Simple aggregations use Prisma's groupBy/aggregate. Time-bucketed and
// cross-table aggregations (e.g. "average score by location") use a small
// number of raw, parameterized-free read-only SQL queries — Prisma's
// query builder does not support grouping by a joined table's column, and
// hand-written GROUP BY SQL is the standard, well-documented escape hatch
// for that case. These queries are 100% read-only and take no user input,
// so there is no injection surface.
// ============================================================================

import { prisma } from "./client";

export interface DashboardSummary {
  totalTransactions: number;
  transactionsAnalyzed: number;
  highRiskCount: number;
  criticalRiskCount: number;
  averageRiskScore: number;
  anomalyRatePct: number;
  reviewQueueCount: number;
  riskDistribution: { level: string; count: number }[];
  topRiskFactors: { category: string; count: number; avgImpact: number }[];
  recentHighRisk: Awaited<ReturnType<typeof getRecentHighRiskTransactions>>;
}

async function getRecentHighRiskTransactions(limit = 8) {
  return prisma.transaction.findMany({
    where: { riskAssessment: { is: { riskLevel: { in: ["HIGH", "CRITICAL"] } } } },
    include: {
      customer: true,
      riskAssessment: {
        include: { riskFactors: { orderBy: { impact: "desc" }, take: 1 } },
      },
    },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    totalTransactions,
    transactionsAnalyzed,
    byLevel,
    avgScoreAgg,
    reviewQueueCount,
    recentHighRisk,
    topFactorsRaw,
  ] = await Promise.all([
    prisma.transaction.count(),
    prisma.riskAssessment.count(),
    prisma.riskAssessment.groupBy({ by: ["riskLevel"], _count: { riskLevel: true } }),
    prisma.riskAssessment.aggregate({ _avg: { finalScore: true } }),
    prisma.case.count({ where: { status: { in: ["open", "investigating", "escalated"] } } }),
    getRecentHighRiskTransactions(8),
    prisma.riskFactor.groupBy({
      by: ["category"],
      _count: { category: true },
      _avg: { impact: true },
      orderBy: { _count: { category: "desc" } },
      take: 7,
    }),
  ]);

  const levelCounts = Object.fromEntries(
    byLevel.map((b: { riskLevel: string; _count: { riskLevel: number } }) => [b.riskLevel, b._count.riskLevel])
  );
  const highRiskCount = levelCounts["HIGH"] ?? 0;
  const criticalRiskCount = levelCounts["CRITICAL"] ?? 0;
  const flaggedCount = highRiskCount + criticalRiskCount;

  return {
    totalTransactions,
    transactionsAnalyzed,
    highRiskCount,
    criticalRiskCount,
    averageRiskScore: Math.round((avgScoreAgg._avg.finalScore ?? 0) * 10) / 10,
    anomalyRatePct: transactionsAnalyzed > 0 ? Math.round((flaggedCount / transactionsAnalyzed) * 1000) / 10 : 0,
    reviewQueueCount,
    riskDistribution: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => ({
      level,
      count: levelCounts[level] ?? 0,
    })),
    topRiskFactors: topFactorsRaw.map((f: { category: string; _count: { category: number }; _avg: { impact: number | null } }) => ({
      category: f.category,
      count: f._count.category,
      avgImpact: Math.round((f._avg.impact ?? 0) * 10) / 10,
    })),
    recentHighRisk,
  };
}

export interface RiskTrendPoint {
  day: string;
  avgScore: number;
  count: number;
  highRiskCount: number;
}

export async function getRiskTrend(days = 30): Promise<RiskTrendPoint[]> {
  const rows = await prisma.$queryRaw<
    { day: Date; avg_score: number | null; count: bigint; high_risk_count: bigint }[]
  >`
    SELECT
      date_trunc('day', t."timestamp") AS day,
      AVG(ra."finalScore")::float AS avg_score,
      COUNT(*)::bigint AS count,
      COUNT(*) FILTER (WHERE ra."riskLevel" IN ('HIGH', 'CRITICAL'))::bigint AS high_risk_count
    FROM "Transaction" t
    JOIN "RiskAssessment" ra ON ra."transactionId" = t.id
    WHERE t."timestamp" >= NOW() - make_interval(days => ${days}::int)
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    avgScore: Math.round((r.avg_score ?? 0) * 10) / 10,
    count: Number(r.count),
    highRiskCount: Number(r.high_risk_count),
  }));
}

export interface BreakdownPoint {
  key: string;
  count: number;
  avgScore: number;
  highRiskCount: number;
}

export async function getRiskByLocation(limit = 10): Promise<BreakdownPoint[]> {
  const rows = await prisma.$queryRaw<
    { location: string; count: bigint; avg_score: number | null; high_risk_count: bigint }[]
  >`
    SELECT
      t."location" AS location,
      COUNT(*)::bigint AS count,
      AVG(ra."finalScore")::float AS avg_score,
      COUNT(*) FILTER (WHERE ra."riskLevel" IN ('HIGH', 'CRITICAL'))::bigint AS high_risk_count
    FROM "Transaction" t
    JOIN "RiskAssessment" ra ON ra."transactionId" = t.id
    GROUP BY t."location"
    ORDER BY avg_score DESC NULLS LAST
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    key: r.location,
    count: Number(r.count),
    avgScore: Math.round((r.avg_score ?? 0) * 10) / 10,
    highRiskCount: Number(r.high_risk_count),
  }));
}

export async function getRiskByPaymentMethod(): Promise<BreakdownPoint[]> {
  const rows = await prisma.$queryRaw<
    { payment_method: string; count: bigint; avg_score: number | null; high_risk_count: bigint }[]
  >`
    SELECT
      t."paymentMethod" AS payment_method,
      COUNT(*)::bigint AS count,
      AVG(ra."finalScore")::float AS avg_score,
      COUNT(*) FILTER (WHERE ra."riskLevel" IN ('HIGH', 'CRITICAL'))::bigint AS high_risk_count
    FROM "Transaction" t
    JOIN "RiskAssessment" ra ON ra."transactionId" = t.id
    GROUP BY t."paymentMethod"
    ORDER BY avg_score DESC NULLS LAST
  `;
  return rows.map((r) => ({
    key: r.payment_method,
    count: Number(r.count),
    avgScore: Math.round((r.avg_score ?? 0) * 10) / 10,
    highRiskCount: Number(r.high_risk_count),
  }));
}

export async function getRiskByDeviceFamiliarity(): Promise<BreakdownPoint[]> {
  const rows = await prisma.$queryRaw<
    { is_new_device: boolean; count: bigint; avg_score: number | null; high_risk_count: bigint }[]
  >`
    SELECT
      t."isNewDevice" AS is_new_device,
      COUNT(*)::bigint AS count,
      AVG(ra."finalScore")::float AS avg_score,
      COUNT(*) FILTER (WHERE ra."riskLevel" IN ('HIGH', 'CRITICAL'))::bigint AS high_risk_count
    FROM "Transaction" t
    JOIN "RiskAssessment" ra ON ra."transactionId" = t.id
    GROUP BY t."isNewDevice"
  `;
  return rows.map((r) => ({
    key: r.is_new_device ? "New Device" : "Recognized Device",
    count: Number(r.count),
    avgScore: Math.round((r.avg_score ?? 0) * 10) / 10,
    highRiskCount: Number(r.high_risk_count),
  }));
}

export async function getReviewOutcomes(): Promise<{ status: string; count: number }[]> {
  const rows = await prisma.case.groupBy({ by: ["status"], _count: { status: true } });
  return rows.map((r: { status: string; _count: { status: number } }) => ({ status: r.status, count: r._count.status }));
}

export async function getRiskDistribution(): Promise<{ level: string; count: number }[]> {
  const rows = await prisma.riskAssessment.groupBy({ by: ["riskLevel"], _count: { riskLevel: true } });
  const counts = Object.fromEntries(
    rows.map((r: { riskLevel: string; _count: { riskLevel: number } }) => [r.riskLevel, r._count.riskLevel])
  );
  return ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => ({ level, count: counts[level] ?? 0 }));
}

export async function getTopRiskFactors(limit = 7): Promise<{ category: string; count: number; avgImpact: number }[]> {
  const rows = await prisma.riskFactor.groupBy({
    by: ["category"],
    _count: { category: true },
    _avg: { impact: true },
    orderBy: { _count: { category: "desc" } },
    take: limit,
  });
  return rows.map((f: { category: string; _count: { category: number }; _avg: { impact: number | null } }) => ({
    category: f.category,
    count: f._count.category,
    avgImpact: Math.round((f._avg.impact ?? 0) * 10) / 10,
  }));
}
