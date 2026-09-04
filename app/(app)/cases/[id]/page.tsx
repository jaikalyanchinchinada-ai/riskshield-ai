import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCaseByRef } from "@/lib/database/cases";
import { Card, CardHeader, CardTitle, RiskBadge, StatusBadge, Badge } from "@/components/ui/card";
import { RiskFactorList } from "@/components/risk/risk-factor-list";
import { DetailGrid } from "@/components/ui/detail-grid";
import { AIAnalysisPanel } from "@/components/ai/ai-analysis-panel";
import { CaseActions } from "@/components/cases/case-actions";
import { CaseNotes } from "@/components/cases/case-notes";
import { AuditTimeline } from "@/components/cases/audit-timeline";
import { formatAction, formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { RiskLevel } from "@/lib/risk-engine/types";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const caseRecord = await getCaseByRef(params.id);
  if (!caseRecord) notFound();

  const { transaction, riskAssessment } = caseRecord;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Link href="/cases" className="inline-flex items-center gap-1.5 text-sm text-canvas-muted hover:text-slate-700 mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to review queue
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-mono">{caseRecord.caseRef}</h1>
          <p className="text-sm text-canvas-muted mt-0.5">
            <Link href={`/transactions/${transaction.transactionRef}`} className="text-brand-600 hover:underline">
              {transaction.transactionRef}
            </Link>{" "}
            · {formatCurrency(transaction.amount, transaction.currency)} · {formatDateTime(caseRecord.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={riskAssessment.riskLevel as RiskLevel} />
          <StatusBadge status={caseRecord.status} />
          <Badge variant="outline">Priority: {caseRecord.priority}</Badge>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Analyst Actions</CardTitle>
        </CardHeader>
        <CaseActions caseRef={caseRecord.caseRef} currentStatus={caseRecord.status} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Factors Behind This Case</CardTitle>
            </CardHeader>
            <RiskFactorList factors={riskAssessment.riskFactors as any} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Action</CardTitle>
            </CardHeader>
            <p className="text-sm font-semibold text-slate-800 mb-1">{formatAction(riskAssessment.recommendedAction)}</p>
            <p className="text-sm text-slate-600">{riskAssessment.actionReason}</p>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction & Customer</CardTitle>
            </CardHeader>
            <DetailGrid
              items={[
                { label: "Amount", value: formatCurrency(transaction.amount, transaction.currency) },
                { label: "Customer", value: transaction.customer.customerRef },
                { label: "Merchant", value: transaction.merchantName },
                { label: "Payment Method", value: transaction.paymentMethod.toUpperCase() },
                { label: "Device", value: transaction.deviceRefUsed },
                { label: "Location", value: transaction.location },
                { label: "Account Age", value: `${transaction.accountAgeDays} days` },
                { label: "Failed Attempts", value: transaction.failedAttempts },
              ]}
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analyst Notes</CardTitle>
            </CardHeader>
            <CaseNotes caseRef={caseRecord.caseRef} notes={caseRecord.notes as any} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
            </CardHeader>
            <AuditTimeline entries={caseRecord.auditLogs as any} />
          </Card>
        </div>

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
