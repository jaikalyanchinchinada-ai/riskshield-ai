"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { RiskBadge, StatusBadge, Badge } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Skeleton, EmptyState, Pagination } from "@/components/ui/feedback";
import { formatCurrency, formatRelativeTime, formatAction } from "@/lib/utils/format";
import type { RiskLevel } from "@/lib/risk-engine/types";

interface CaseRow {
  caseRef: string;
  status: string;
  priority: string;
  createdAt: string;
  transaction: {
    transactionRef: string;
    amount: number;
    currency: string;
    customer: { customerRef: string };
  };
  riskAssessment: {
    finalScore: number;
    riskLevel: RiskLevel;
    recommendedAction: string;
    riskFactors: { description: string }[];
  };
  assignedAnalyst: { name: string } | null;
}

export default function CasesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: CaseRow[]; totalPages: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "15");
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);

    try {
      const res = await fetch(`/api/cases?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, page]);

  useEffect(() => {
    const t = setTimeout(fetchData, 250);
    return () => clearTimeout(t);
  }, [fetchData]);

  useEffect(() => setPage(1), [search, status, priority]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Human Review Queue"
        description={data ? `${data.total.toLocaleString()} cases` : "Loading..."}
      />

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by case ID or transaction ID..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="sm:w-40">
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
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
          <EmptyState icon={ShieldAlert} title="No cases found" description="Try adjusting your search or filters." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Case</TH>
                  <TH>Transaction</TH>
                  <TH>Risk Reason</TH>
                  <TH>Score</TH>
                  <TH>Recommended</TH>
                  <TH>Status</TH>
                  <TH>Analyst</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((c) => (
                  <TR key={c.caseRef}>
                    <TD>
                      <Link href={`/cases/${c.caseRef}`} className="font-medium text-brand-600 hover:underline">
                        {c.caseRef}
                      </Link>
                    </TD>
                    <TD className="text-xs">
                      {c.transaction.transactionRef}
                      <div className="text-canvas-muted">{formatCurrency(c.transaction.amount, c.transaction.currency)}</div>
                    </TD>
                    <TD className="text-xs max-w-[220px] truncate" title={c.riskAssessment.riskFactors[0]?.description}>
                      {c.riskAssessment.riskFactors[0]?.description ?? "—"}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{c.riskAssessment.finalScore}</span>
                        <RiskBadge level={c.riskAssessment.riskLevel} />
                      </div>
                    </TD>
                    <TD>
                      <Badge variant="outline">{formatAction(c.riskAssessment.recommendedAction)}</Badge>
                    </TD>
                    <TD>
                      <StatusBadge status={c.status} />
                    </TD>
                    <TD className="text-xs">{c.assignedAnalyst?.name ?? "Unassigned"}</TD>
                    <TD className="text-xs text-canvas-muted">{formatRelativeTime(c.createdAt)}</TD>
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
