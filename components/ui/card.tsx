import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import type { RiskLevel } from "@/lib/risk-engine/types";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-5 transition-shadow duration-200 hover:shadow-md", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between mb-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold text-slate-700", className)} {...props} />;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" | "muted" }) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    outline: "border border-canvas-border text-slate-600",
    muted: "bg-slate-50 text-slate-500",
  };
  return <span className={cn("badge", variants[variant], className)} {...props} />;
}

const RISK_LABEL: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span className={cn("badge", `risk-badge-${level}`, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", `bg-current`)} />
      {RISK_LABEL[level]}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  investigating: "bg-blue-50 text-blue-700",
  escalated: "bg-orange-50 text-orange-700",
  resolved: "bg-green-50 text-green-700",
  false_positive: "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  investigating: "Investigating",
  escalated: "Escalated",
  resolved: "Resolved",
  false_positive: "False Positive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("badge", STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700", className)}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
