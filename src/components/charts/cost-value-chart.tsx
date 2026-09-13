"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import { ClientOnlyChart } from "@/components/charts/client-only-chart";
import {
  HISTORY_RANGES,
  sliceHistory,
  type HistoryRange,
} from "@/components/charts/nav-history-chart";
import type { NavHistoryPoint } from "@/lib/services/history";
import { cn, formatDate, formatMoney, formatPct } from "@/lib/utils";

function ChartTooltip({
  active,
  payload,
  currency,
  fx,
}: {
  active?: boolean;
  payload?: Array<{ payload: NavHistoryPoint }>;
  currency: string;
  fx: number;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-[10px] bg-[var(--surface)] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-[var(--separator)]">
      <p className="text-[11px] font-medium text-[var(--muted)]">
        {formatDate(point.date)}
      </p>
      <p className="money mt-0.5 text-[13px] font-semibold">
        Value {formatMoney(point.valueUsd * fx, currency)}
      </p>
      <p className="money text-[13px] text-[var(--muted)]">
        Cost {formatMoney(point.investedUsd * fx, currency)}
      </p>
    </div>
  );
}

export function CostValueChart({
  points,
  currency,
  fx,
}: {
  points: NavHistoryPoint[];
  currency: string;
  fx: number;
}) {
  const [range, setRange] = useState<HistoryRange>("MAX");
  const [scrub, setScrub] = useState<NavHistoryPoint | null>(null);

  const sliced = useMemo(
    () => sliceHistory(points, range),
    [points, range],
  );

  const display = scrub ?? sliced[sliced.length - 1];
  const money = (usd: number) => formatMoney(usd * fx, currency);
  const pnl = display ? display.valueUsd - display.investedUsd : 0;
  const pnlPct =
    display && display.investedUsd !== 0
      ? (pnl / Math.abs(display.investedUsd)) * 100
      : 0;
  const up = pnl >= 0;

  if (points.length < 2) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <h2 className="ios-title">Cost vs value</h2>
      </div>
      <div className="ios-group p-4">
        <p className="text-[13px] text-[var(--muted)]">Value</p>
        <p className="money text-[22px] font-semibold tracking-tight">
          {money(display?.valueUsd ?? 0)}
        </p>
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">
          Cost {money(display?.investedUsd ?? 0)}
        </p>
        <p
          className={cn(
            "mt-1 text-[15px] font-semibold",
            up ? "text-[var(--positive)]" : "text-[var(--negative)]",
          )}
        >
          {up ? "▲" : "▼"} {money(Math.abs(pnl))}{" "}
          <span className="font-medium">({formatPct(pnlPct)})</span>
        </p>

        <div
          className="-mx-1 mt-4 h-[148px] touch-pan-y"
          role="img"
          aria-label="Cost versus market value"
        >
          <ClientOnlyChart className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sliced}
                margin={{ top: 8, right: 2, left: 2, bottom: 0 }}
                onMouseMove={(state) => {
                  const next = (
                    state as {
                      activePayload?: Array<{ payload?: NavHistoryPoint }>;
                    }
                  ).activePayload?.[0]?.payload;
                  if (next?.date) setScrub(next);
                }}
                onMouseLeave={() => setScrub(null)}
              >
                <YAxis
                  hide
                  domain={[
                    (min: number) => (Number.isFinite(min) ? min * 0.97 : min),
                    (max: number) => (Number.isFinite(max) ? max * 1.03 : max),
                  ]}
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltip
                      active={props.active}
                      payload={
                        props.payload as unknown as
                          | Array<{ payload: NavHistoryPoint }>
                          | undefined
                      }
                      currency={currency}
                      fx={fx}
                    />
                  )}
                  cursor={{
                    stroke: "var(--muted-2)",
                    strokeWidth: 1,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="investedUsd"
                  stroke="var(--muted)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="valueUsd"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        </div>

        <div className="mt-3 flex justify-center gap-4 text-[12px] font-medium text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 rounded-full bg-[var(--muted)]" />
            Cost
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 rounded-full bg-[var(--accent)]" />
            Value
          </span>
        </div>
      </div>

      <div
        className="mx-auto flex h-8 w-full max-w-[340px] items-center rounded-full bg-[var(--surface-3)] p-0.5"
        role="tablist"
        aria-label="Cost vs value range"
      >
        {HISTORY_RANGES.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={range === item}
            onClick={() => {
              setRange(item);
              setScrub(null);
            }}
            className={cn(
              "ios-pressable h-7 flex-1 rounded-full text-[12px] font-semibold tracking-tight",
              range === item
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_0.5px_1px_rgba(0,0,0,0.12)]"
                : "text-[var(--muted)]",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
