"use client";

import { useTransition } from "react";
import { setDisplayCurrencyAction } from "@/lib/actions";
import type { DisplayCurrency } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const options: DisplayCurrency[] = ["USD", "EUR", "BOB"];

export function CurrencyToggle({ current }: { current: DisplayCurrency }) {
  const [pending, start] = useTransition();

  return (
    <div
      className="inline-flex rounded-full bg-[var(--surface-3)] p-0.5"
      role="group"
      aria-label="Moneda de visualización"
    >
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
            "ios-hit min-h-7 min-w-[40px] rounded-full px-2.5 text-[13px] font-semibold transition-all",
            current === c
              ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
              : "text-[var(--muted)]",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
