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
      className="inline-flex h-7 items-center rounded-full bg-[var(--surface-3)] p-0.5"
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
            "h-6 min-w-[38px] rounded-full px-2.5 text-[12px] font-semibold leading-none tracking-tight transition-all",
            current === c
              ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_0.5px_1px_rgba(0,0,0,0.12)]"
              : "text-[var(--muted)]",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
