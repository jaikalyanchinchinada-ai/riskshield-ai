import Link from "next/link";
import { ShieldCheck, ArrowRight, FlaskConical, Sparkles } from "lucide-react";
import { getDashboardSummary } from "@/lib/database/analytics";
import { formatNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let stats: { totalTransactions: number; highRiskCount: number; averageRiskScore: number } | null = null;
  try {
    stats = await getDashboardSummary();
  } catch {
    stats = null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-canvas to-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />

      <div className="absolute top-6 right-6 flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Log In
          </Button>
        </Link>
        <Link href="/signup">
          <Button variant="outline" size="sm">
            Sign Up
          </Button>
        </Link>
      </div>

      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-surface shadow-lg shadow-slate-900/20 mb-6">
          <ShieldCheck className="h-7 w-7 text-brand-400" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">RiskShield AI</h1>
        <p className="mt-3 text-lg text-canvas-muted">
          Explainable AI for smarter payment risk decisions.
        </p>
        <p className="mt-4 text-sm text-canvas-muted max-w-lg mx-auto leading-relaxed">
          Detect suspicious behavior, understand exactly why it&apos;s risky, and help analysts make
          faster, evidence-based decisions — with a deterministic risk engine, an anomaly-detection
          model, and an AI analyst working together, never replacing the human reviewer.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button size="lg" className="w-full sm:w-auto">
              Open Risk Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/simulator">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <FlaskConical className="h-4 w-4" /> Run Transaction Simulation
            </Button>
          </Link>
        </div>

        {stats && (
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            <div className="card py-4">
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatNumber(stats.totalTransactions)}
              </div>
              <div className="text-xs text-canvas-muted mt-1">Transactions analyzed</div>
            </div>
            <div className="card py-4">
              <div className="text-2xl font-bold text-risk-high tabular-nums">
                {formatNumber(stats.highRiskCount)}
              </div>
              <div className="text-xs text-canvas-muted mt-1">High-risk flagged</div>
            </div>
            <div className="card py-4">
              <div className="text-2xl font-bold text-brand-600 tabular-nums">{stats.averageRiskScore}</div>
              <div className="text-xs text-canvas-muted mt-1">Avg. risk score</div>
            </div>
          </div>
        )}

        <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-canvas-muted">
          <Sparkles className="h-3.5 w-3.5" />
          Hackathon demo — synthetic data only. Not an official product of any payment company.
        </p>
      </div>
    </main>
  );
}
