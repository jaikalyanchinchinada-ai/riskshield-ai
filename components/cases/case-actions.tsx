"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowUpCircle, ShieldQuestion, Ban, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const ACTIONS = [
  { action: "approve", label: "Approve", icon: CheckCircle2, variant: "success" as const },
  { action: "verify", label: "Request Verification", icon: ShieldQuestion, variant: "outline" as const },
  { action: "escalate", label: "Escalate", icon: ArrowUpCircle, variant: "secondary" as const },
  { action: "block", label: "Block", icon: Ban, variant: "danger" as const },
  { action: "false_positive", label: "Mark False Positive", icon: XCircle, variant: "ghost" as const },
];

export function CaseActions({ caseRef, currentStatus }: { caseRef: string; currentStatus: string }) {
  const [pending, setPending] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  async function runAction(action: string, label: string) {
    setPending(action);
    try {
      const res = await fetch(`/api/cases/${caseRef}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, analystName: "Demo Analyst" }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast(`Case ${caseRef}: ${label} recorded`, "success");
      router.refresh();
    } catch {
      toast("Could not update the case. Please try again.", "error");
    } finally {
      setPending(null);
    }
  }

  const isResolved = currentStatus === "resolved" || currentStatus === "false_positive";

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map(({ action, label, icon: Icon, variant }) => (
        <Button
          key={action}
          variant={variant}
          size="sm"
          disabled={isResolved || pending !== null}
          loading={pending === action}
          onClick={() => runAction(action, label)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      ))}
      {isResolved && <p className="text-xs text-canvas-muted self-center">This case is closed.</p>}
    </div>
  );
}
