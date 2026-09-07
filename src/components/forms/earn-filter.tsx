"use client";

import { useRouter, usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function EarnFilter({ showEarn }: { showEarn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={showEarn}
      aria-label="Show Earn"
      onClick={() => {
        const url = showEarn ? pathname : `${pathname}?earn=1`;
        router.replace(url, { scroll: false });
      }}
      className="ios-pressable inline-flex min-h-11 items-center gap-2"
    >
      <span
        className={cn(
          "flex size-[22px] items-center justify-center rounded-[6px] border",
          showEarn
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[var(--separator)] bg-[var(--surface-2)]",
        )}
        aria-hidden
      >
        {showEarn ? (
          <Check size={14} strokeWidth={3} className="text-[var(--accent-fg)]" />
        ) : null}
      </span>
      <span className="text-[15px] text-[var(--ink)]">Earn</span>
    </button>
  );
}
