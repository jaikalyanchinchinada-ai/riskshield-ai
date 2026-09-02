import { Activity, AlertTriangle, ShieldAlert, Gauge, ListChecks, TrendingUp, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentHighRiskTable } from "@/components/dashboard/recent-high-risk-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskTrendChart, RiskDistributionChart, TopFactorsChart } from "@/components/charts/risk-charts";
import { getDashboardSummary, getRiskTrend } from "@/lib/database/analytics";
import { formatNumber } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, trend] = await Promise.all([getDashboardSummary(), getRiskTrend(30)]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Risk Operations Dashboard"
        description="What's happening with payment risk right now."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Transactions" value={formatNumber(summary.totalTransactions)} icon={Receipt} />
        <StatCard label="Transactions Analyzed" value={formatNumber(summary.transactionsAnalyzed)} icon={Activity} />
        <StatCard
          label="High-Risk Transactions"
          value={formatNumber(summary.highRiskCount)}
          icon={AlertTriangle}
          tone="high"
        />
        <StatCard
          label="Critical-Risk Transactions"
          value={formatNumber(summary.criticalRiskCount)}
          icon={ShieldAlert}
          tone="critical"
        />
        <StatCard label="Average Risk Score" value={summary.averageRiskScore} suffix="/ 100" icon={Gauge} />
        <StatCard
          label="Anomaly / Fraud Rate"
          value={summary.anomalyRatePct}
          suffix="%"
          icon={TrendingUp}
          tone={summary.anomalyRatePct > 8 ? "high" : "default"}
        />
        <StatCard label="Review Queue" value={formatNumber(summary.reviewQueueCount)} icon={ListChecks} />
        <StatCard
          label="Low-Risk Share"
          value={
            summary.transactionsAnalyzed > 0
              ? Math.round(
                  ((summary.riskDistribution.find((d) => d.level === "LOW")?.count ?? 0) /
                    summary.transactionsAnalyzed) *
                    100
                )
              : 0
          }
          suffix="%"
          icon={Activity}
          tone="good"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <RiskTrendChart data={trend} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <RiskDistributionChart data={summary.riskDistribution} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Top Risk Factors</CardTitle>
          </CardHeader>
          <TopFactorsChart data={summary.topRiskFactors} />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent High-Risk Transactions</CardTitle>
          </CardHeader>
          <RecentHighRiskTable transactions={summary.recentHighRisk as any} />
        </Card>
      </div>
    </div>
  );
}
