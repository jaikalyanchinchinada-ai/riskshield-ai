"use client";

import { useState } from "react";
import { Sparkles, ShieldQuestion, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { formatAction } from "@/lib/utils/format";
import { useToast } from "@/components/ui/toast";
import type { AIInvestigationSummary } from "@/lib/ai/types";

export function AIAnalysisPanel({ transactionRef }: { transactionRef: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIInvestigationSummary | null>(null);
  const { toast } = useToast();

  async function runAnalysis() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionRef }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "AI analysis failed");
      }
      const json: AIInvestigationSummary = await res.json();
      setResult(json);
    } catch (e) {
      toast(e instanceof Error ? e.message : "AI analysis failed", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50">
          <Sparkles className="h-5 w-5 text-brand-500" />
        </div>
        <p className="text-sm text-slate-600 mb-4 max-w-sm">
          Get an AI-generated investigation summary grounded entirely in this transaction&apos;s
          calculated risk factors — no invented evidence.
        </p>
        <Button onClick={runAnalysis} loading={loading}>
          {loading ? "Analyzing..." : "Analyze with AI"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Badge variant={result.source === "llm" ? "default" : "muted"}>
          {result.source === "llm" ? (
            <>
              <Sparkles className="h-3 w-3" /> AI-generated
            </>
          ) : (
            <>
              <ShieldQuestion className="h-3 w-3" /> Rule-based fallback
            </>
          )}
        </Badge>
        <Button variant="ghost" size="sm" onClick={runAnalysis} loading={loading}>
          Re-analyze
        </Button>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-canvas-muted uppercase tracking-wide mb-1.5">Risk Summary</h4>
        <p className="text-sm text-slate-700 leading-relaxed">{result.riskSummary}</p>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-canvas-muted uppercase tracking-wide mb-1.5">Why It&apos;s Suspicious</h4>
        <ul className="space-y-1.5">
          {result.whyItIsSuspicious.map((item, i) => (
            <li key={i} className="text-sm text-slate-700 flex gap-2">
              <span className="text-brand-500 mt-1">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-canvas-muted uppercase tracking-wide mb-1.5">Evidence (Observed)</h4>
        <ul className="space-y-1.5">
          {result.evidence.map((item, i) => (
            <li key={i} className="text-xs text-slate-600 font-mono bg-slate-50 rounded px-2 py-1.5">
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-canvas-border p-3.5 bg-slate-50/60">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold text-canvas-muted uppercase tracking-wide">Recommended Action</h4>
          <span className="text-xs text-canvas-muted">Confidence: {result.confidence}</span>
        </div>
        <p className="text-sm font-semibold text-slate-800">{formatAction(result.recommendedAction)}</p>
        <p className="text-xs text-slate-600 mt-1">{result.actionRationale}</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-canvas-muted bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2">
        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
        {result.disclaimer}
      </div>
    </div>
  );
}
