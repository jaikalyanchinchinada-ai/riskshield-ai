import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  suffix,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "high" | "critical" | "good";
  suffix?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "text-slate-900",
    high: "text-risk-high",
    critical: "text-risk-critical",
    good: "text-risk-low",
  };
  const iconTone: Record<string, string> = {
    default: "bg-brand-50 text-brand-600",
    high: "bg-risk-highBg text-risk-high",
    critical: "bg-risk-criticalBg text-risk-critical",
    good: "bg-risk-lowBg text-risk-low",
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-canvas-muted">{label}</p>
          <p className={cn("mt-1.5 text-2xl font-bold tabular-nums", toneClasses[tone])}>
            {value}
            {suffix && <span className="text-sm font-medium text-canvas-muted ml-1">{suffix}</span>}
          </p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconTone[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </div>
  );
}
