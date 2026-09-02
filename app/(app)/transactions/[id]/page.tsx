import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTransactionByRef, getCustomerRecentTransactions } from "@/lib/database/transactions";
import { Card, CardHeader, CardTitle, RiskBadge, Badge } from "@/components/ui/card";
import { RiskMeter } from "@/components/risk/risk-meter";
import { RiskFactorList } from "@/components/risk/risk-factor-list";
import { DetailGrid } from "@/components/ui/detail-grid";
import { AIAnalysisPanel } from "@/components/ai/ai-analysis-panel";
import { CustomerHistoryTable } from "@/components/transactions/customer-history";
import { formatAction, formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { RiskLevel } from "@/lib/risk-engine/types";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({ params }: { params: { id: string } }) {
  const transaction = await getTransactionByRef(params.id);
  if (!transaction) notFound();

  const history = await getCustomerRecentTransactions(transaction.customerId, transaction.id, 5);
  const ra = transaction.riskAssessment;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Link href="/transactions" className="inline-flex items-center gap-1.5 text-sm text-canvas-muted hover:text-slate-700 mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to transactions
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-mono">{transaction.transactionRef}</h1>
          <p className="text-sm text-canvas-muted mt-0.5">
            {transaction.merchantName} · {formatDateTime(transaction.timestamp)}
          </p>
        </div>
        {ra && (
          <div className="flex items-center gap-2">
            <RiskBadge level={ra.riskLevel as RiskLevel} />
            <Badge variant="outline">{formatAction(ra.recommendedAction)}</Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: risk score + factors + details */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {ra ? (
                <RiskMeter score={ra.finalScore} level={ra.riskLevel as RiskLevel} />
              ) : (
                <p className="text-sm text-canvas-muted">Not yet assessed.</p>
              )}
              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 gap-3 text-center sm:text-left">
                  <div>
                    <p className="text-xs text-canvas-muted">Rule Engine Score</p>
                    <p className="text-lg font-semibold text-slate-800">{ra?.ruleScore ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-canvas-muted">ML Anomaly Score</p>
                    <p className="text-lg font-semibold text-slate-800">{ra?.mlAnomalyScore ?? "—"}</p>
                  </div>
                </div>
                {ra && (
                  <p className="text-xs text-canvas-muted mt-3">
                    Final score blends 60% rule engine + 40% ML anomaly model.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Risk Factors — Why This Score?</CardTitle>
            </CardHeader>
            <RiskFactorList factors={(ra?.riskFactors as any) ?? []} />
          </Card>

          {ra && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Action</CardTitle>
              </CardHeader>
              <p className="text-sm font-semibold text-slate-800 mb-1">{formatAction(ra.recommendedAction)}</p>
              <p className="text-sm text-slate-600">{ra.actionReason}</p>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <DetailGrid
              items={[
                { label: "Amount", value: formatCurrency(transaction.amount, transaction.currency) },
                { label: "Currency", value: transaction.currency },
                { label: "Payment Method", value: transaction.paymentMethod.toUpperCase() },
                { label: "Customer", value: transaction.customer.customerRef },
                { label: "Merchant", value: `${transaction.merchantName} (${transaction.merchantId})` },
                { label: "Device", value: transaction.deviceRefUsed },
                { label: "Location", value: transaction.location },
                { label: "IP Region", value: transaction.ipRegion },
                { label: "Account Age", value: `${transaction.accountAgeDays} days` },
                { label: "Historical Avg Amount", value: formatCurrency(transaction.historicalAvgAmount, transaction.currency) },
                { label: "Failed Attempts", value: transaction.failedAttempts },
                { label: "Txns (10 min)", value: transaction.transactionsLast10Min },
                { label: "Txns (24h)", value: transaction.transactionsLast24h },
                { label: "Device Age", value: `${transaction.deviceAgeDays} days` },
                { label: "New Device?", value: transaction.isNewDevice ? "Yes" : "No" },
                { label: "New Location?", value: transaction.isNewLocation ? "Yes" : "No" },
                { label: "Previous Location", value: transaction.previousLocation ?? "—" },
                { label: "Previous Device", value: transaction.previousDevice ?? "—" },
              ]}
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previous Transaction History</CardTitle>
            </CardHeader>
            <CustomerHistoryTable history={history as any} />
          </Card>
        </div>

        {/* Right column: AI analyst */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>RiskShield Analyst</CardTitle>
            </CardHeader>
            <AIAnalysisPanel transactionRef={transaction.transactionRef} />
          </Card>
        </div>
      </div>
    </div>
  );
}
