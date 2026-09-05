"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ClassBreakdown } from "@/lib/services/portfolio";

const COLORS: Record<string, string> = {
  crypto: "#007AFF",
  stock: "#5856D6",
  stable: "#34C759",
  land: "#FF9500",
  cash: "#8E8E93",
};

const LABELS: Record<string, string> = {
  crypto: "Cripto",
  stock: "Acciones",
  stable: "Estables",
  land: "Terrenos",
  cash: "Cash",
};

export function AllocationChart({ data }: { data: ClassBreakdown[] }) {
  const chartData = data
    .filter((d) => d.marketValueUsd > 0)
    .map((d) => ({
      name: LABELS[d.class] ?? d.class,
      value: d.marketValueUsd,
      class: d.class,
    }));

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted)]">
        Sin datos de distribución todavía
      </p>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={3}
            strokeWidth={0}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.class}
                fill={COLORS[entry.class] ?? "#888"}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                : value
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-[var(--ink-soft)]">
        {chartData.map((d) => (
          <li key={d.class} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: COLORS[d.class] }}
            />
            {d.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
