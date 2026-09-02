// ============================================================================
// RiskShield AI — Formatting Utilities
// ============================================================================

export function formatCurrency(amount: number, currency: string = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  }
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDateTime(d);
}

const ACTION_LABELS: Record<string, string> = {
  approve: "Approve",
  monitor: "Monitor",
  verify: "Request Verification",
  manual_review: "Manual Review",
  block: "Block",
};
export function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  investigating: "Investigating",
  escalated: "Escalated",
  resolved: "Resolved",
  false_positive: "False Positive",
};
export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
