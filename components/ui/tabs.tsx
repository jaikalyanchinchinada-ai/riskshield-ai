"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function Tabs({
  tabs,
  defaultTab,
  children,
}: {
  tabs: { id: string; label: string }[];
  defaultTab?: string;
  children: (activeTab: string) => React.ReactNode;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  return (
    <div>
      <div className="flex gap-1 border-b border-canvas-border mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active === tab.id
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-canvas-muted hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  );
}
