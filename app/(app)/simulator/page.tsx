"use client";

import { useState } from "react";
import { FlaskConical, Zap, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, RiskBadge, Badge } from "@/components/ui/card";
import { Input, Select, Label, FieldGroup } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RiskMeter } from "@/components/risk/risk-meter";
import { RiskFactorList } from "@/components/risk/risk-factor-list";
import { useToast } from "@/components/ui/toast";
import { formatAction } from "@/lib/utils/format";
import type { RiskAssessmentResult } from "@/lib/risk-engine/types";

interface SimForm {
  amount: number;
  customerRef: string;
  paymentMethod: string;
  location: string;
  previousLocation: string;
  device: string;
  previousDevice: string;
  isNewDevice: boolean;
  isNewLocation: boolean;
  deviceAgeDays: number;
  failedAttempts: number;
  transactionsLast10Min: number;
  transactionsLast24h: number;
  accountAgeDays: number;
  historicalAvgAmount: number;
}

const DEFAULT_FORM: SimForm = {
  amount: 1200,
  customerRef: "SIM-CUSTOMER",
  paymentMethod: "upi",
  location: "Hyderabad",
  previousLocation: "Hyderabad",
  device: "DEV-11111",
  previousDevice: "DEV-11111",
  isNewDevice: false,
  isNewLocation: false,
  deviceAgeDays: 400,
  failedAttempts: 0,
  transactionsLast10Min: 1,
  transactionsLast24h: 2,
  accountAgeDays: 400,
  historicalAvgAmount: 1100,
};

const SCENARIOS: { label: string; form: SimForm }[] = [
  { label: "Normal Transaction", form: DEFAULT_FORM },
  {
    label: "Suspicious New Device",
    form: {
      ...DEFAULT_FORM,
      amount: 4500,
      historicalAvgAmount: 1200,
      failedAttempts: 1,
      isNewDevice: true,
      deviceAgeDays: 0,
      device: "DEV-99999",
      previousDevice: "DEV-11111",
    },
  },
  {
    label: "Velocity Attack",
    form: {
      ...DEFAULT_FORM,
      amount: 800,
      historicalAvgAmount: 900,
      failedAttempts: 2,
      transactionsLast10Min: 6,
      transactionsLast24h: 18,
      location: "Mumbai",
      previousLocation: "Mumbai",
      device: "DEV-22222",
      previousDevice: "DEV-22222",
    },
  },
  {
    label: "Account Takeover",
    form: {
      ...DEFAULT_FORM,
      amount: 7000,
      historicalAvgAmount: 1300,
      failedAttempts: 5,
      transactionsLast10Min: 3,
      transactionsLast24h: 6,
      isNewDevice: true,
      deviceAgeDays: 0,
      isNewLocation: true,
      location: "Unknown Region",
      previousLocation: "Delhi",
      device: "DEV-77777",
      previousDevice: "DEV-33333",
    },
  },
  {
    label: "High-Value Anomaly",
    form: {
      ...DEFAULT_FORM,
      amount: 45000,
      historicalAvgAmount: 1500,
      accountAgeDays: 600,
      deviceAgeDays: 600,
      location: "Bengaluru",
      previousLocation: "Bengaluru",
      device: "DEV-44444",
      previousDevice: "DEV-44444",
    },
  },
];

export default function SimulatorPage() {
  const [form, setForm] = useState<SimForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ assessment: RiskAssessmentResult; mlSource: string } | null>(null);
  const { toast } = useToast();

  function update<K extends keyof SimForm>(key: K, value: SimForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function analyze() {
    setLoading(true);
    try {
      const res = await fetch("/api/simulator/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }
      const json = await res.json();
      setResult(json);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Analysis failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Transaction Simulator"
        description="Build a hypothetical transaction and watch the risk engine score it live — nothing here is saved to the database."
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Demo Scenarios</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <Button key={s.label} variant="outline" size="sm" onClick={() => { setForm(s.form); setResult(null); }}>
              <Zap className="h-3.5 w-3.5" /> {s.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Inputs</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-2 gap-x-4">
            <FieldGroup>
              <Label>Amount (INR)</Label>
              <Input type="number" value={form.amount} onChange={(e) => update("amount", Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Historical Average Amount</Label>
              <Input
                type="number"
                value={form.historicalAvgAmount}
                onChange={(e) => update("historicalAvgAmount", Number(e.target.value))}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value)}>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">Netbanking</option>
                <option value="wallet">Wallet</option>
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>Customer Reference</Label>
              <Input value={form.customerRef} onChange={(e) => update("customerRef", e.target.value)} />
            </FieldGroup>

            <FieldGroup>
              <Label>Device ID</Label>
              <Input value={form.device} onChange={(e) => update("device", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label>Previous Device ID</Label>
              <Input value={form.previousDevice} onChange={(e) => update("previousDevice", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label>Previous Location</Label>
              <Input value={form.previousLocation} onChange={(e) => update("previousLocation", e.target.value)} />
            </FieldGroup>

            <FieldGroup>
              <Label>Device Age (days)</Label>
              <Input type="number" value={form.deviceAgeDays} onChange={(e) => update("deviceAgeDays", Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Account Age (days)</Label>
              <Input type="number" value={form.accountAgeDays} onChange={(e) => update("accountAgeDays", Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Failed Attempts</Label>
              <Input type="number" value={form.failedAttempts} onChange={(e) => update("failedAttempts", Number(e.target.value))} />
            </FieldGroup>
            <FieldGroup>
              <Label>Txns in Last 10 Min</Label>
              <Input
                type="number"
                value={form.transactionsLast10Min}
                onChange={(e) => update("transactionsLast10Min", Number(e.target.value))}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Txns in Last 24h</Label>
              <Input
                type="number"
                value={form.transactionsLast24h}
                onChange={(e) => update("transactionsLast24h", Number(e.target.value))}
              />
            </FieldGroup>

            <FieldGroup className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                id="isNewDevice"
                checked={form.isNewDevice}
                onChange={(e) => update("isNewDevice", e.target.checked)}
                className="h-4 w-4 rounded border-canvas-border"
              />
              <Label htmlFor="isNewDevice" className="mb-0">
                New device?
              </Label>
            </FieldGroup>
            <FieldGroup className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                id="isNewLocation"
                checked={form.isNewLocation}
                onChange={(e) => update("isNewLocation", e.target.checked)}
                className="h-4 w-4 rounded border-canvas-border"
              />
              <Label htmlFor="isNewLocation" className="mb-0">
                New location?
              </Label>
            </FieldGroup>
          </div>

          <Button onClick={analyze} loading={loading} className="w-full mt-2" size="lg">
            <FlaskConical className="h-4 w-4" /> Analyze Transaction
          </Button>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Risk Assessment</CardTitle>
          </CardHeader>

          {!result ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-canvas-muted">
              <Sparkles className="h-8 w-8 mb-3 text-slate-300" />
              <p className="text-sm">Fill in the form and click &quot;Analyze Transaction&quot; to see the risk engine in action.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <RiskMeter score={result.assessment.finalScore} level={result.assessment.riskLevel} size={140} />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={result.assessment.riskLevel} />
                    <Badge variant="outline">{formatAction(result.assessment.action.action)}</Badge>
                  </div>
                  <p className="text-xs text-canvas-muted">
                    Rule score: {result.assessment.ruleScore} · ML anomaly: {result.assessment.mlAnomalyScore} (
                    {result.mlSource === "isolation_forest" ? "model" : "fallback heuristic"})
                  </p>
                  <p className="text-sm text-slate-600">{result.assessment.action.reason}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-canvas-muted uppercase tracking-wide mb-2">Risk Factors</h4>
                <RiskFactorList factors={result.assessment.riskFactors} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
