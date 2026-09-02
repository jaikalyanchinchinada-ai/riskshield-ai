"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      <AlertTriangle className="h-10 w-10 text-risk-critical mb-4" />
      <h1 className="text-lg font-semibold text-slate-800">Something went wrong</h1>
      <p className="text-sm text-canvas-muted mt-1 max-w-sm">
        An unexpected error occurred while loading this page. You can try again, or head back to the dashboard.
      </p>
      <Button onClick={() => reset()} className="mt-5">
        Try Again
      </Button>
    </div>
  );
}
