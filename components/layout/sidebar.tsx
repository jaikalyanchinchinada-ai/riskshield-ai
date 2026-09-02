"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  FlaskConical,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SessionPayload } from "@/lib/auth/session";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/cases", label: "Review Queue", icon: ShieldAlert },
  { href: "/simulator", label: "Simulator", icon: FlaskConical },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar({ user }: { user: SessionPayload }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-surface text-white">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 shadow-lg shadow-brand-500/30">
          <ShieldCheck className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="font-semibold tracking-tight">RiskShield AI</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/25 translate-x-0.5"
                  : "text-slate-300 hover:bg-white/8 hover:text-white hover:translate-x-0.5"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold shadow-md shadow-brand-500/30">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400 capitalize">{user.role.replace("_", " ")}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Log out"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-low" />
          Demo mode — synthetic data only
        </div>
      </div>
    </aside>
  );
}
