"use client";

import type { ClassBreakdown } from "@/lib/services/portfolio";
import { classLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";

const COLORS: Record<string, string> = {
  crypto: "#007AFF",
  stock: "#5856D6",
  stable: "#34C759",
  land: "#FF9500",
  cash: "#8E8E93",
};

export function AllocationChart({
  data,
  currency = "USD",
  fx = 1,
}: {
  data: ClassBreakdown[];
  currency?: string;
  fx?: number;
}) {
  const chartData = data
    .filter((d) => d.marketValueUsd > 0)
    .sort((a, b) => b.marketValueUsd - a.marketValueUsd);

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-[15px] text-[var(--muted)]">
        Sin datos de distribución todavía
      </p>
    );
  }

  const money = (usd: number) => formatMoney(usd * fx, currency);
  let cursor = 0;
  const gradient = chartData
    .map((d) => {
      const start = cursor;
      cursor += d.weightPct;
      return `${COLORS[d.class] ?? "#888"} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="space-y-5">
      <div
        className="relative mx-auto size-[148px] rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
        aria-hidden
      >
        <div className="absolute inset-[22px] rounded-full bg-[var(--surface)]" />
      </div>
      <ul className="space-y-2.5">
        {chartData.map((d) => (
          <li key={d.class} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-[15px]">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: COLORS[d.class] }}
              />
              {classLabel(d.class)}
            </span>
            <span className="money shrink-0 text-[13px] text-[var(--muted)]">
              {d.weightPct.toFixed(1)}% · {money(d.marketValueUsd)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
