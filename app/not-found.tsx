import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      <ShieldOff className="h-10 w-10 text-slate-300 mb-4" />
      <h1 className="text-lg font-semibold text-slate-800">Not found</h1>
      <p className="text-sm text-canvas-muted mt-1 max-w-sm">
        We couldn&apos;t find what you were looking for. It may have been removed or the reference is incorrect.
      </p>
      <Link href="/dashboard" className="mt-5">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
