"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { RiskBadge } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Skeleton, EmptyState, Pagination } from "@/components/ui/feedback";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { RiskLevel } from "@/lib/risk-engine/types";

interface TransactionRow {
  transactionRef: string;
  amount: number;
  currency: string;
  merchantName: string;
  paymentMethod: string;
  timestamp: string;
  customer: { customerRef: string };
  riskAssessment: { finalScore: number; riskLevel: RiskLevel; riskFactors: { description: string }[] } | null;
}

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: TransactionRow[]; totalPages: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "15");
    if (search) params.set("search", search);
    if (riskLevel) params.set("riskLevel", riskLevel);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);

    try {
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [search, riskLevel, paymentMethod, page]);

  useEffect(() => {
    const t = setTimeout(fetchData, 250); // small debounce for search typing
    return () => clearTimeout(t);
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search, riskLevel, paymentMethod]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Transactions"
        description={data ? `${data.total.toLocaleString()} transactions` : "Loading..."}
      />

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by transaction ID, customer, merchant, or device..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="sm:w-44">
            <option value="">All Risk Levels</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="sm:w-44">
            <option value="">All Payment Methods</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="netbanking">Netbanking</option>
            <option value="wallet">Wallet</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading && !data ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Transaction</TH>
                  <TH>Customer</TH>
                  <TH>Merchant</TH>
                  <TH>Amount</TH>
                  <TH>Method</TH>
                  <TH>Risk</TH>
                  <TH>Timestamp</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((t) => (
                  <TR key={t.transactionRef}>
                    <TD>
                      <Link href={`/transactions/${t.transactionRef}`} className="font-medium text-brand-600 hover:underline">
                        {t.transactionRef}
                      </Link>
                    </TD>
                    <TD className="text-xs">{t.customer.customerRef}</TD>
                    <TD className="text-xs">{t.merchantName}</TD>
                    <TD className="font-mono text-xs">{formatCurrency(t.amount, t.currency)}</TD>
                    <TD className="text-xs uppercase">{t.paymentMethod}</TD>
                    <TD>
                      {t.riskAssessment ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{t.riskAssessment.finalScore}</span>
                          <RiskBadge level={t.riskAssessment.riskLevel} />
                        </div>
                      ) : (
                        <span className="text-xs text-canvas-muted">Not assessed</span>
                      )}
                    </TD>
                    <TD className="text-xs text-canvas-muted">{formatDateTime(t.timestamp)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
