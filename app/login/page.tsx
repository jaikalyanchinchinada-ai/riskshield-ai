"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not log in. Please try again.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface shadow-lg shadow-slate-900/20 mb-4">
          <ShieldCheck className="h-6 w-6 text-brand-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-sm text-canvas-muted mt-1">Log in to the RiskShield AI risk desk</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 shadow-lg">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-risk-criticalBg text-risk-critical text-sm px-3 py-2.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <FieldGroup>
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            required
            autoFocus
            placeholder="you@riskshield.demo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FieldGroup>

        <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Logging in..." : "Log In"}
        </Button>

        <p className="text-center text-xs text-canvas-muted mt-4">
          New analyst?{" "}
          <Link href="/signup" className="text-brand-600 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </form>

      <p className="text-center text-xs text-canvas-muted mt-6">
        Demo tip: after seeding the database, try{" "}
        <span className="font-mono">analyst1@riskshield.demo</span> / <span className="font-mono">demo1234</span>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-b from-canvas to-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
