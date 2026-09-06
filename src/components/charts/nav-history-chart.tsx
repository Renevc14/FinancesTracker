"use client";

import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import type { NavHistoryPoint } from "@/lib/services/history";
import { cn, formatDate, formatMoney, formatPct } from "@/lib/utils";

export type HistoryRange = "1M" | "3M" | "6M" | "YTD" | "MAX";

const RANGES: HistoryRange[] = ["1M", "3M", "6M", "YTD", "MAX"];

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeStart(range: HistoryRange, end: string): string {
  if (range === "MAX") return "0000-01-01";
  if (range === "YTD") return `${end.slice(0, 4)}-01-01`;
  if (range === "1M") return addMonths(end, -1);
  if (range === "3M") return addMonths(end, -3);
  return addMonths(end, -6);
}

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
      <p className="money mt-0.5 text-[15px] font-semibold">
        {formatMoney(point.valueUsd * fx, currency)}
      </p>
    </div>
  );
}

export function NavHistoryChart({
  points,
  currentUsd,
  currency,
  fx,
}: {
  points: NavHistoryPoint[];
  currentUsd: number;
  currency: string;
  fx: number;
}) {
  const gradientId = useId().replace(/:/g, "");
  const [range, setRange] = useState<HistoryRange>("MAX");
  const [scrub, setScrub] = useState<NavHistoryPoint | null>(null);

  const sliced = useMemo(() => {
    if (points.length === 0) return [];
    const end = points[points.length - 1].date;
    const start = rangeStart(range, end);
    const filtered = points.filter((p) => p.date >= start);
    return filtered.length >= 2 ? filtered : points.slice(-2);
  }, [points, range]);

  const display = scrub ?? sliced[sliced.length - 1];
  const first = sliced[0];
  const delta = display && first ? display.valueUsd - first.valueUsd : 0;
  const deltaPct =
    first && first.valueUsd !== 0 ? (delta / Math.abs(first.valueUsd)) * 100 : 0;
  const up = delta >= 0;
  const stroke = up ? "var(--positive)" : "var(--negative)";
  const money = (usd: number) => formatMoney(usd * fx, currency);

  if (points.length < 2) {
    return (
      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-[var(--muted)]">
          Patrimonio total
        </p>
        <h1 className="ios-large-title money">{money(currentUsd)}</h1>
        <p className="py-6 text-center text-[15px] text-[var(--muted)]">
          Aún no hay historial suficiente para el gráfico
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-[13px] font-medium text-[var(--muted)]">
          Patrimonio total
        </p>
        <h1 className="ios-large-title money">
          {money(display?.valueUsd ?? currentUsd)}
        </h1>
        <p
          className={cn(
            "text-[15px] font-semibold",
            up ? "text-[var(--positive)]" : "text-[var(--negative)]",
          )}
        >
          {up ? "▲" : "▼"} {money(Math.abs(delta))}{" "}
          <span className="font-medium">({formatPct(deltaPct)})</span>
          <span className="ml-1.5 font-medium text-[var(--muted)]">
            {range === "MAX" ? "en el período" : range}
          </span>
        </p>
      </div>

      <div
        className="-mx-1 h-[176px] touch-pan-y"
        role="img"
        aria-label="Evolución histórica del patrimonio"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
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
                strokeDasharray: "0",
              }}
            />
            <Area
              type="monotone"
              dataKey="valueUsd"
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{
                r: 4.5,
                strokeWidth: 2,
                stroke: "var(--surface)",
                fill: stroke,
              }}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div
        className="mx-auto flex h-8 w-full max-w-[340px] items-center rounded-full bg-[var(--surface-3)] p-0.5"
        role="tablist"
        aria-label="Rango del gráfico"
      >
        {RANGES.map((item) => (
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
