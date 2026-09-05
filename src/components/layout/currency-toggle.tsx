"use client";

import { useTransition } from "react";
import { setDisplayCurrencyAction } from "@/lib/actions";
import type { DisplayCurrency } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const options: DisplayCurrency[] = ["USD", "EUR", "BOB"];

export function CurrencyToggle({ current }: { current: DisplayCurrency }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-xs">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          disabled={pending}
          onClick={() =>
            start(() => {
              void setDisplayCurrencyAction(c);
            })
          }
          className={cn(
            "rounded-md px-2.5 py-1.5 font-medium transition-colors",
            current === c
              ? "bg-[var(--ink)] text-[var(--bg)]"
              : "text-[var(--muted)] hover:text-[var(--ink)]",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
