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
  const pnlPositive = dash.pnlUsd >= 0;

  return (
    <div className="space-y-6">
      <section className="animate-fade-in space-y-1 pt-2">
        <p className="text-[13px] text-[var(--muted)]">Patrimonio total</p>
        <h1 className="ios-large-title font-mono tracking-tight">
          {money(dash.totalMarketValueUsd)}
        </h1>
        <p
          className={`text-[15px] font-medium ${pnlPositive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
        >
          {pnlPositive ? "▲" : "▼"} {money(Math.abs(dash.pnlUsd))} (
          {formatPct(dash.pnlPct)})
        </p>
        {dash.lastUpdated && (
          <p className="text-[13px] text-[var(--muted-2)]">
            Actualizado {formatDate(dash.lastUpdated)}
          </p>
        )}
      </section>

      <section className="ios-group animate-fade-in">
        <div className="grid grid-cols-2">
          <Kpi label="Invertido" value={money(dash.totalInvestedUsd)} />
          <Kpi label="Valor" value={money(dash.totalMarketValueUsd)} border />
          <Kpi
            label="G/P"
            value={money(dash.pnlUsd)}
            tone={pnlPositive ? "pos" : "neg"}
            top
          />
          <Kpi
            label="Rendimiento"
            value={formatPct(dash.pnlPct)}
            tone={pnlPositive ? "pos" : "neg"}
            border
            top
          />
        </div>
      </section>

      <section className="animate-fade-in space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="ios-title">Terrenos</h2>
          <Link
            href="/land"
            className="text-[15px] font-medium text-[var(--accent)]"
          >
            Ver
          </Link>
        </div>
        <div className="ios-group space-y-3 p-4">
          <p className="text-[15px] text-[var(--ink-soft)]">
            Pagado {money(dash.landPaidUsd)} de {money(dash.landCommittedUsd)}
          </p>
          <Progress
            value={
              dash.landCommittedUsd > 0
                ? (dash.landPaidUsd / dash.landCommittedUsd) * 100
                : 0
            }
          />
          {dash.nextLandPayment && (
            <p className="text-[13px] text-[var(--warn)]">
              Próximo: {formatDate(dash.nextLandPayment.dueDate)} ·{" "}
              {formatMoney(
                dash.nextLandPayment.amountLocal,
                dash.nextLandPayment.currency,
              )}{" "}
              ({dash.nextLandPayment.landTicker})
            </p>
          )}
        </div>
      </section>

      <section className="animate-fade-in space-y-2">
        <h2 className="ios-title px-1">Distribución</h2>
        <div className="ios-group p-4">
          <AllocationChart data={dash.byClass} />
        </div>
      </section>

      <section className="animate-fade-in space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="ios-title">Actividad</h2>
          <Link
            href="/transactions"
            className="text-[15px] font-medium text-[var(--accent)]"
          >
            Ver todo
          </Link>
        </div>
        <ul className="ios-group">
          {dash.recentTransactions.length === 0 && (
            <li className="px-4 py-6 text-center text-[15px] text-[var(--muted)]">
              Sin movimientos todavía
            </li>
          )}
          {dash.recentTransactions.map((tx) => (
            <li key={tx.id} className="ios-row">
              <div className="min-w-0">
                <p className="ios-headline truncate">
                  {tx.ticker}{" "}
                  <span className="font-normal text-[var(--muted)]">
                    {tx.type}
                  </span>
                </p>
                <p className="text-[13px] text-[var(--muted)]">
                  {formatDate(tx.date)}
                </p>
              </div>
              <p className="shrink-0 font-mono text-[15px] font-semibold">
                {money(tx.totalUsd)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {dash.holdings.length > 0 && (
        <section className="animate-fade-in space-y-2">
          <h2 className="ios-title px-1">Holdings</h2>
          <ul className="ios-group">
            {dash.holdings.map((h) => (
              <li key={h.assetId} className="ios-row">
                <div className="min-w-0">
                  <p className="ios-headline">{h.ticker}</p>
                  <p className="text-[13px] text-[var(--muted)]">
                    {h.quantity.toLocaleString(undefined, {
                      maximumFractionDigits: 8,
                    })}{" "}
                    · {h.class}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[15px] font-semibold">
                    {money(h.marketValueUsd)}
                  </p>
                  <p
                    className={`text-[13px] ${h.pnlPct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
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
  border,
  top,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  border?: boolean;
  top?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 ${border ? "border-l border-[var(--separator)]" : ""} ${top ? "border-t border-[var(--separator)]" : ""}`}
    >
      <p className="text-[13px] text-[var(--muted)]">{label}</p>
      <p
        className={`mt-0.5 font-mono text-[17px] font-semibold ${
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
