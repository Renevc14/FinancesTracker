"use client";

import type { ClassBreakdown, HoldingRow } from "@/lib/services/portfolio";
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
  holdings = [],
  currency = "USD",
  fx = 1,
}: {
  data: ClassBreakdown[];
  holdings?: HoldingRow[];
  currency?: string;
  fx?: number;
}) {
  const classSlices = data
    .filter((d) => d.marketValueUsd > 0)
    .sort((a, b) => b.marketValueUsd - a.marketValueUsd);

  if (classSlices.length === 0) {
    return (
      <p className="py-8 text-center text-[15px] text-[var(--muted)]">
        Sin datos de distribución todavía
      </p>
    );
  }

  const money = (usd: number) => formatMoney(usd * fx, currency);
  let cursor = 0;
  const gradient = classSlices
    .map((d) => {
      const start = cursor;
      cursor += d.weightPct;
      return `${COLORS[d.class] ?? "#888"} ${start}% ${cursor}%`;
    })
    .join(", ");

  const lots = holdings
    .filter((h) => h.class === "land" && h.marketValueUsd > 0)
    .sort((a, b) => b.marketValueUsd - a.marketValueUsd);

  const legendSlices = [...classSlices].sort((a, b) => {
    if (a.class === "land") return -1;
    if (b.class === "land") return 1;
    return b.marketValueUsd - a.marketValueUsd;
  });

  return (
    <div className="space-y-5">
      <div
        className="relative mx-auto size-[148px] rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
        aria-hidden
      >
        <div className="absolute inset-[22px] rounded-full bg-[var(--surface)]" />
      </div>
      <ul className="space-y-3">
        {legendSlices.map((d) => {
          const children =
            d.class === "land"
              ? lots
              : holdings
                  .filter((h) => h.class === d.class && h.marketValueUsd > 0)
                  .sort((a, b) => b.marketValueUsd - a.marketValueUsd);
          const showLots = d.class === "land" && lots.length > 0;

          return (
            <li key={d.class} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
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
              </div>
              {showLots && (
                <ul className="space-y-1 pl-[18px]">
                  {lots.map((lot) => (
                    <li
                      key={lot.assetId}
                      className="flex items-center justify-between gap-3 text-[13px]"
                    >
                      <span className="min-w-0 truncate text-[var(--ink-soft)]">
                        {lot.ticker}
                        <span className="text-[var(--muted-2)]"> · al costo</span>
                      </span>
                      <span className="money shrink-0 text-[var(--muted)]">
                        {money(lot.marketValueUsd)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!showLots && children.length > 1 && (
                <ul className="space-y-1 pl-[18px]">
                  {children.map((h) => (
                    <li
                      key={h.assetId}
                      className="flex items-center justify-between gap-3 text-[13px]"
                    >
                      <span className="min-w-0 truncate text-[var(--ink-soft)]">
                        {h.ticker}
                      </span>
                      <span className="money shrink-0 text-[var(--muted)]">
                        {money(h.marketValueUsd)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
