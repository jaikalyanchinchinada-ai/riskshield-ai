import { formatDateTime } from "@/lib/utils/format";
import { Clock } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  analystName: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  aiRecommendation: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  status_change: "Status changed",
  note_added: "Note added",
  ai_analysis_run: "AI analysis run",
  escalated: "Escalated case",
  approved: "Approved",
  blocked: "Blocked",
  verification_requested: "Verification requested",
  false_positive: "Marked false positive",
};

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) {
    return <p className="text-sm text-canvas-muted">No audit history yet.</p>;
  }

  return (
    <ol className="relative border-l border-canvas-border ml-1.5 space-y-5">
      {entries.map((entry) => (
        <li key={entry.id} className="ml-4">
          <span className="absolute -translate-x-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
          <div className="flex items-center gap-2 text-xs text-canvas-muted mb-0.5">
            <Clock className="h-3 w-3" />
            {formatDateTime(entry.createdAt)}
          </div>
          <p className="text-sm font-medium text-slate-800">
            {ACTION_LABELS[entry.action] ?? entry.action}
            <span className="font-normal text-canvas-muted"> — {entry.analystName}</span>
          </p>
          {entry.previousStatus && entry.newStatus && (
            <p className="text-xs text-canvas-muted mt-0.5">
              {entry.previousStatus} → {entry.newStatus}
            </p>
          )}
          {entry.reason && <p className="text-sm text-slate-600 mt-1">{entry.reason}</p>}
          {entry.aiRecommendation && (
            <p className="text-xs text-brand-600 mt-1 bg-brand-50 rounded px-2 py-1 inline-block">
              AI recommendation: {entry.aiRecommendation}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
