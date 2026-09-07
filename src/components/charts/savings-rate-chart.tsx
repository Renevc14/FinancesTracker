"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClientOnlyChart } from "@/components/charts/client-only-chart";
import type { SavingsSummary } from "@/lib/services/savings";
import { cn, formatMoney } from "@/lib/utils";

function ChartTooltip({
  active,
  payload,
  currency,
  fx,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number;
    payload?: { label: string; ratioPct: number };
  }>;
  currency: string;
  fx: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const salary = payload.find((p) => p.dataKey === "salaryUsd")?.value ?? 0;
  const invested = payload.find((p) => p.dataKey === "investedUsd")?.value ?? 0;
  return (
    <div className="rounded-[10px] bg-[var(--surface)] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-[var(--separator)]">
      <p className="text-[11px] font-medium text-[var(--muted)]">{row?.label}</p>
      <p className="money mt-0.5 text-[13px]">
        Invested {formatMoney(invested * fx, currency)} / salary{" "}
        {formatMoney(salary * fx, currency)}
      </p>
      <p className="text-[12px] text-[var(--muted)]">
        {(row?.ratioPct ?? 0).toFixed(1)}%
      </p>
    </div>
  );
}

export function SavingsRateChart({
  summary,
  currency,
  fx,
}: {
  summary: SavingsSummary;
  currency: string;
  fx: number;
}) {
  const money = (usd: number) => formatMoney(usd * fx, currency);
  const data = summary.months.map((m) => ({
    ...m,
    tick: m.label.slice(0, 3),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <h2 className="ios-title">Saved vs salary</h2>
      </div>
      <div className="ios-group p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[13px] text-[var(--muted)]">This month</p>
            <p className="money text-[22px] font-semibold tracking-tight">
              {summary.current.ratioPct.toFixed(1)}%
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {money(summary.current.investedUsd)} of{" "}
              {money(summary.current.salaryUsd)}
            </p>
          </div>
          <div className="border-l border-[var(--separator)] pl-3">
            <p className="text-[13px] text-[var(--muted)]">Since Feb</p>
            <p
              className={cn(
                "money text-[22px] font-semibold tracking-tight",
                summary.totalRatioPct >= 20
                  ? "text-[var(--positive)]"
                  : undefined,
              )}
            >
              {summary.totalRatioPct.toFixed(1)}%
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {money(summary.totalInvestedUsd)} of{" "}
              {money(summary.totalSalaryUsd)}
            </p>
          </div>
        </div>
        <div className="-mx-1 mt-4 h-[148px]">
          <ClientOnlyChart className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="tick"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-2)", fontSize: 11 }}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "var(--surface-3)" }}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={
                      props.payload as unknown as
                        | Array<{
                            dataKey?: string;
                            value?: number;
                            payload?: { label: string; ratioPct: number };
                          }>
                        | undefined
                    }
                    currency={currency}
                    fx={fx}
                  />
                )}
              />
              <Bar
                dataKey="salaryUsd"
                fill="var(--surface-3)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                dataKey="investedUsd"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
          </ClientOnlyChart>
        </div>
      </div>
    </div>
  );
}
