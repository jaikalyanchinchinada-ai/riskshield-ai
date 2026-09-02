import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { prisma } from "@/lib/database/client";
import { getAIProviderStatus } from "@/lib/ai/provider";
import { CATEGORY_MAX_POINTS, BLEND_WEIGHTS, RISK_LEVEL_THRESHOLDS } from "@/lib/risk-engine/config";
import { CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="h-4 w-4 text-risk-low" /> : <XCircle className="h-4 w-4 text-risk-critical" />}
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  amount_anomaly: "Amount Anomaly",
  velocity_risk: "Velocity Risk",
  device_risk: "Device Risk",
  location_risk: "Location Risk",
  failed_attempt_risk: "Failed Attempt Risk",
  account_risk: "Account Risk",
  behavioral_anomaly: "Behavioral Anomaly",
};

export default async function SettingsPage() {
  const ai = getAIProviderStatus();

  let dbConnected = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbConnected = false;
  }

  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      <PageHeader title="Settings" description="System status and risk engine configuration for this demo." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <StatusPill ok={dbConnected} label={`Database: ${dbConnected ? "Connected" : "Unreachable"}`} />
            <StatusPill ok label="Risk Engine: Operational" />
            <StatusPill ok label="ML Model: Operational (Isolation Forest)" />
            <StatusPill ok={ai.configured} label={`AI Provider: ${ai.configured ? `Configured (${ai.provider})` : "Not configured — using rule-based fallback"}`} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Provider</CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Provider: <Badge variant="outline">{ai.provider}</Badge>
            </p>
            <p>Model: {ai.model ?? "—"}</p>
            <p className="text-xs text-canvas-muted mt-2">
              Set <code className="font-mono">AI_PROVIDER</code> and <code className="font-mono">AI_API_KEY</code> in
              your <code className="font-mono">.env</code> file to enable real LLM-generated investigation
              summaries. Without them, RiskShield Analyst uses transparent, deterministic templates built from
              the same risk factors — the app always works.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Risk Score Blend</CardTitle>
        </CardHeader>
        <p className="text-sm text-slate-700">
          Final Score = {BLEND_WEIGHTS.rule * 100}% × Rule Engine Score + {BLEND_WEIGHTS.ml * 100}% × ML Anomaly
          Score
        </p>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Risk Category Weights (max points)</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(CATEGORY_MAX_POINTS).map(([key, value]) => (
            <div key={key} className="rounded-lg bg-slate-50 border border-canvas-border px-3 py-2.5">
              <p className="text-xs text-canvas-muted">{CATEGORY_LABELS[key] ?? key}</p>
              <p className="text-lg font-semibold text-slate-800">{value} pts</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-canvas-muted mt-3">
          These weights live in <code className="font-mono">lib/risk-engine/config.ts</code> and can be tuned
          without touching any UI code.
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk Level Thresholds</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RISK_LEVEL_THRESHOLDS.map((t) => (
            <div key={t.level} className="rounded-lg bg-slate-50 border border-canvas-border px-3 py-2.5 text-center">
              <p className="text-xs text-canvas-muted">{t.level}</p>
              <p className="text-sm font-semibold text-slate-800">
                {t.min}–{t.max}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
