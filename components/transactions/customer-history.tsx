import Link from "next/link";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { RiskBadge } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { History } from "lucide-react";
import type { RiskLevel } from "@/lib/risk-engine/types";

interface HistoryRow {
  transactionRef: string;
  amount: number;
  currency: string;
  timestamp: Date | string;
  riskAssessment: { finalScore: number; riskLevel: string } | null;
}

export function CustomerHistoryTable({ history }: { history: HistoryRow[] }) {
  if (!history.length) {
    return <EmptyState icon={History} title="No prior transactions" description="This is the customer's first recorded transaction." />;
  }
  return (
    <Table>
      <THead>
        <TR>
          <TH>Transaction</TH>
          <TH>Amount</TH>
          <TH>Risk</TH>
          <TH>When</TH>
        </TR>
      </THead>
      <TBody>
        {history.map((h) => (
          <TR key={h.transactionRef}>
            <TD>
              <Link href={`/transactions/${h.transactionRef}`} className="text-brand-600 hover:underline text-xs font-medium">
                {h.transactionRef}
              </Link>
            </TD>
            <TD className="font-mono text-xs">{formatCurrency(h.amount, h.currency)}</TD>
            <TD>{h.riskAssessment ? <RiskBadge level={h.riskAssessment.riskLevel as RiskLevel} /> : <span className="text-xs text-canvas-muted">—</span>}</TD>
            <TD className="text-xs text-canvas-muted">{formatDateTime(h.timestamp)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
