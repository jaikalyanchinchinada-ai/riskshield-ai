import Link from "next/link";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { RiskBadge } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatCurrency, formatRelativeTime } from "@/lib/utils/format";
import { ShieldOff } from "lucide-react";
import type { RiskLevel } from "@/lib/risk-engine/types";

interface RowData {
  transactionRef: string;
  amount: number;
  currency: string;
  merchantName: string;
  timestamp: Date | string;
  customer: { customerRef: string };
  riskAssessment: {
    finalScore: number;
    riskLevel: string;
    riskFactors: { description: string }[];
  } | null;
}

export function RecentHighRiskTable({ transactions }: { transactions: RowData[] }) {
  if (!transactions.length) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="No high-risk transactions yet"
        description="Once transactions are analyzed, the riskiest ones will show up here."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Transaction</TH>
          <TH>Customer</TH>
          <TH>Amount</TH>
          <TH>Top Reason</TH>
          <TH>Score</TH>
          <TH>When</TH>
        </TR>
      </THead>
      <TBody>
        {transactions.map((t) => (
          <TR key={t.transactionRef}>
            <TD>
              <Link href={`/transactions/${t.transactionRef}`} className="font-medium text-brand-600 hover:underline">
                {t.transactionRef}
              </Link>
              <div className="text-xs text-canvas-muted">{t.merchantName}</div>
            </TD>
            <TD className="text-xs">{t.customer.customerRef}</TD>
            <TD className="font-mono text-xs">{formatCurrency(t.amount, t.currency)}</TD>
            <TD className="text-xs max-w-[240px] truncate" title={t.riskAssessment?.riskFactors[0]?.description}>
              {t.riskAssessment?.riskFactors[0]?.description ?? "—"}
            </TD>
            <TD>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">{t.riskAssessment?.finalScore}</span>
                <RiskBadge level={(t.riskAssessment?.riskLevel as RiskLevel) ?? "LOW"} />
              </div>
            </TD>
            <TD className="text-xs text-canvas-muted">{formatRelativeTime(t.timestamp)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
