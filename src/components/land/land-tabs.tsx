"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type LandTabId = "contract" | "payments" | "schedule" | "status";

const TABS: { id: LandTabId; label: string }[] = [
  { id: "status", label: "Estado" },
  { id: "contract", label: "Contrato" },
  { id: "payments", label: "Pagos" },
  { id: "schedule", label: "Cronograma" },
];

export function LandTabs({
  panels,
  defaultTab = "status",
}: {
  panels: Record<LandTabId, React.ReactNode>;
  defaultTab?: LandTabId;
}) {
  const [tab, setTab] = useState<LandTabId>(defaultTab);

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
              tab === t.id
                ? "bg-[var(--ink)] text-[var(--bg)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="animate-fade-in">
        {panels[tab]}
      </div>
    </div>
  );
}
