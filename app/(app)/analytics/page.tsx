import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RiskTrendChart,
  RiskDistributionChart,
  BreakdownBarChart,
  TopFactorsChart,
} from "@/components/charts/risk-charts";
import {
  getRiskTrend,
  getRiskByLocation,
  getRiskByPaymentMethod,
  getRiskByDeviceFamiliarity,
  getReviewOutcomes,
  getRiskDistribution,
  getTopRiskFactors,
} from "@/lib/database/analytics";

export const dynamic = "force-dynamic";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Netbanking",
  wallet: "Wallet",
};

export default async function AnalyticsPage() {
  const [trend, byLocation, byPaymentMethod, byDevice, reviewOutcomes, distribution, topFactors] = await Promise.all([
    getRiskTrend(30),
    getRiskByLocation(8),
    getRiskByPaymentMethod(),
    getRiskByDeviceFamiliarity(),
    getReviewOutcomes(),
    getRiskDistribution(),
    getTopRiskFactors(7),
  ]);

  const paymentMethodData = byPaymentMethod.map((d) => ({ ...d, key: PAYMENT_METHOD_LABELS[d.key] ?? d.key }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Risk Analytics" description="Trends and breakdowns across all assessed transactions." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk Score Over Time (30 Days)</CardTitle>
          </CardHeader>
          <RiskTrendChart data={trend} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <RiskDistributionChart data={distribution} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Average Risk by Location</CardTitle>
          </CardHeader>
          <BreakdownBarChart data={byLocation} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Risk by Payment Method</CardTitle>
          </CardHeader>
          <BreakdownBarChart data={paymentMethodData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Risk Factors</CardTitle>
          </CardHeader>
          <TopFactorsChart data={topFactors} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Device Familiarity vs. Risk</CardTitle>
          </CardHeader>
          <BreakdownBarChart data={byDevice} />
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Review Outcomes</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-4">
          {reviewOutcomes.map((o) => (
            <div key={o.status} className="flex-1 min-w-[120px] rounded-lg bg-slate-50 border border-canvas-border p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{o.count}</div>
              <div className="text-xs text-canvas-muted mt-1 capitalize">{o.status.replace("_", " ")}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
