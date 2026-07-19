"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type RadarTab = "prioridades" | "desempenho";

const tabs: Array<{ id: RadarTab; label: string }> = [
  { id: "prioridades", label: "Prioridades" },
  { id: "desempenho", label: "Desempenho" },
];

export function RadarTabs({
  initialTab,
  priorities,
  performance,
}: {
  initialTab: RadarTab;
  priorities: React.ReactNode;
  performance: React.ReactNode;
}) {
  const [tab, setTab] = useState<RadarTab>(initialTab);

  return (
    <div>
      <div
        className="mb-6 flex flex-wrap gap-2 border-b border-slate-200"
        role="tablist"
        aria-label="Visões do radar"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => {
              setTab(item.id);
              window.history.replaceState(
                null,
                "",
                `/dashboard/radar?tab=${item.id}`,
              );
            }}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
              tab === item.id
                ? "border-blue-700 font-semibold text-blue-900"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-rise">
        {tab === "prioridades" ? priorities : performance}
      </div>
    </div>
  );
}
