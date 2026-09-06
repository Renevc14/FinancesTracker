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
        className="flex rounded-full bg-[var(--surface-3)] p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-full px-2 py-1.5 text-[13px] font-semibold tracking-tight",
              tab === t.id
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_0.5px_1px_rgba(0,0,0,0.12)]"
                : "text-[var(--muted)]",
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
