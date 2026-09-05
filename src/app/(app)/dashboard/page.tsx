import Link from "next/link";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { Progress } from "@/components/ui/progress";
import {
  convertFromUsd,
  getPortfolioDashboard,
} from "@/lib/services/portfolio";
import { formatDate, formatMoney, formatPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dash = await getPortfolioDashboard();
  const fx = dash.fxToDisplay;
  const cur = dash.displayCurrency;
  const money = (usd: number) => formatMoney(convertFromUsd(usd, fx), cur);

  return (
    <div className="space-y-8">
      <section className="animate-rise space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Total patrimonio
        </p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          {money(dash.totalMarketValueUsd)}
        </h1>
        <p
          className={`text-sm ${dash.pnlUsd >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
        >
          {dash.pnlUsd >= 0 ? "↑" : "↓"} {money(Math.abs(dash.pnlUsd))} (
          {formatPct(dash.pnlPct)}) vs invertido
        </p>
        {dash.lastUpdated && (
          <p className="text-xs text-[var(--muted)]">
            Última actualización: {formatDate(dash.lastUpdated)}
          </p>
        )}
      </section>

      <section
        className="grid grid-cols-2 gap-3 animate-rise"
        style={{ animationDelay: "80ms" }}
      >
        <Kpi label="Invertido" value={money(dash.totalInvestedUsd)} />
        <Kpi label="Valor actual" value={money(dash.totalMarketValueUsd)} />
        <Kpi
          label="G/P"
          value={money(dash.pnlUsd)}
          tone={dash.pnlUsd >= 0 ? "pos" : "neg"}
        />
        <Kpi label="Rendimiento" value={formatPct(dash.pnlPct)} />
      </section>

      <section
        className="space-y-3 animate-rise"
        style={{ animationDelay: "140ms" }}
      >
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl">Terrenos</h2>
          <Link
            href="/land"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            ver detalle →
          </Link>
        </div>
        <p className="text-sm text-[var(--ink-soft)]">
          Pagado {money(dash.landPaidUsd)} / {money(dash.landCommittedUsd)}
        </p>
        <Progress
          value={
            dash.landCommittedUsd > 0
              ? (dash.landPaidUsd / dash.landCommittedUsd) * 100
              : 0
          }
        />
        {dash.nextLandPayment && (
          <p className="text-sm text-[var(--warn)]">
            Próximo pago: {formatDate(dash.nextLandPayment.dueDate)} ·{" "}
            {formatMoney(
              dash.nextLandPayment.amountLocal,
              dash.nextLandPayment.currency,
            )}{" "}
            ({dash.nextLandPayment.landTicker})
          </p>
        )}
      </section>

      <section
        className="space-y-3 animate-rise"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="font-display text-xl">Distribución</h2>
        <AllocationChart data={dash.byClass} />
      </section>

      <section
        className="space-y-3 animate-rise"
        style={{ animationDelay: "260ms" }}
      >
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl">Últimas transacciones</h2>
          <Link
            href="/transactions"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            ver todas →
          </Link>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {dash.recentTransactions.length === 0 && (
            <li className="py-4 text-sm text-[var(--muted)]">
              Sin transacciones todavía
            </li>
          )}
          {dash.recentTransactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between py-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {tx.ticker}{" "}
                  <span className="text-[var(--muted)]">· {tx.type}</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {formatDate(tx.date)}
                </p>
              </div>
              <p className="font-mono">{money(tx.totalUsd)}</p>
            </li>
          ))}
        </ul>
      </section>

      {dash.holdings.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl">Holdings</h2>
          <ul className="space-y-2">
            {dash.holdings.map((h) => (
              <li
                key={h.assetId}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-3"
              >
                <div>
                  <p className="font-medium">{h.ticker}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {h.quantity.toLocaleString(undefined, {
                      maximumFractionDigits: 8,
                    })}{" "}
                    · {h.class}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{money(h.marketValueUsd)}</p>
                  <p
                    className={`text-xs ${h.pnlPct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                  >
                    {formatPct(h.pnlPct)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-base font-semibold ${
          tone === "pos"
            ? "text-[var(--positive)]"
            : tone === "neg"
              ? "text-[var(--negative)]"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
