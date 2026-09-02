import { cn } from "@/lib/utils/cn";
import { AlertCircle } from "lucide-react";

interface Factor {
  category: string;
  description: string;
  impact: number;
  severity: string;
}

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-risk-critical",
  medium: "bg-risk-high",
  low: "bg-risk-medium",
  info: "bg-slate-400",
};

export function RiskFactorList({ factors }: { factors: Factor[] }) {
  if (!factors.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-canvas-muted py-4">
        <AlertCircle className="h-4 w-4" />
        No individual risk factors were triggered for this transaction.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {factors.map((f, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {i + 1}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", SEVERITY_DOT[f.severity] ?? "bg-slate-400")} />
              <p className="text-sm text-slate-700 leading-snug">{f.description}</p>
            </div>
            <span className="text-xs text-canvas-muted ml-3">{f.category.replace(/_/g, " ")}</span>
          </div>
          <span
            className={cn(
              "flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
              f.impact >= 12 ? "bg-risk-criticalBg text-risk-critical" : f.impact >= 6 ? "bg-risk-highBg text-risk-high" : "bg-slate-100 text-slate-600"
            )}
          >
            +{f.impact}
          </span>
        </li>
      ))}
    </ol>
  );
}
