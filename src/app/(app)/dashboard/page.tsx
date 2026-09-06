import Link from "next/link";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { RefreshMarketsButton } from "@/components/forms/refresh-markets-button";
import { Progress } from "@/components/ui/progress";
import { classLabel, txTypeLabel } from "@/lib/labels";
import { daysUntil } from "@/lib/services/market";
import {
  convertFromUsd,
  getPortfolioDashboard,
} from "@/lib/services/portfolio";
import {
  formatDate,
  formatMoney,
  formatPct,
  formatQuantity,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dash = await getPortfolioDashboard();
  const fx = dash.fxToDisplay;
  const cur = dash.displayCurrency;
  const money = (usd: number) => formatMoney(convertFromUsd(usd, fx), cur);
  const pnlPositive = dash.pnlUsd >= 0;
  const landPct =
    dash.landCommittedUsd > 0
      ? (dash.landPaidUsd / dash.landCommittedUsd) * 100
      : 0;

  const landDueDays = dash.nextLandPayment
    ? daysUntil(dash.nextLandPayment.dueDate)
    : null;

  return (
    <div className="space-y-8">
      {dash.nextLandPayment && landDueDays != null && landDueDays <= 14 && (
        <section className="ios-group p-4">
          <p className="text-[15px] font-semibold text-[var(--warn)]">
            Cuota de lote en {landDueDays < 0 ? "atraso" : `${landDueDays} días`}
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {formatDate(dash.nextLandPayment.dueDate)} ·{" "}
            {formatMoney(
              dash.nextLandPayment.amountLocal,
              dash.nextLandPayment.currency,
            )}{" "}
            · {dash.nextLandPayment.landTicker}
          </p>
        </section>
      )}
      <section className="animate-fade-in space-y-1.5">
        <p className="text-[13px] font-medium text-[var(--muted)]">
          Patrimonio total
        </p>
        <h1 className="ios-large-title money">{money(dash.totalMarketValueUsd)}</h1>
        <p
          className={`text-[15px] font-semibold ${pnlPositive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
        >
          {pnlPositive ? "▲" : "▼"} {money(Math.abs(dash.pnlUsd))}{" "}
          <span className="font-medium">({formatPct(dash.pnlPct)})</span>
        </p>
        {dash.lastUpdated && (
          <p className="text-[13px] text-[var(--muted-2)]">
            Actualizado {formatDate(dash.lastUpdated)}
          </p>
        )}
        {dash.landPaidUsd > 0 && (
          <p className="text-[13px] text-[var(--muted)]">
            Incluye lotes al costo · {money(dash.landPaidUsd)}
          </p>
        )}
        <div className="pt-1">
          <RefreshMarketsButton />
        </div>
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

      <section className="animate-fade-in space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="ios-title">Terrenos</h2>
          <Link
            href="/land"
            className="text-[15px] font-medium text-[var(--accent)]"
          >
            Ver
          </Link>
        </div>
        <div className="ios-group space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[15px] text-[var(--ink-soft)]">Pagado</p>
            <p className="money text-[15px] font-semibold">
              {money(dash.landPaidUsd)}
              <span className="ml-1 font-normal text-[var(--muted)]">
                de {money(dash.landCommittedUsd)}
              </span>
            </p>
          </div>
          <Progress value={landPct} />
          {dash.nextLandPayment && (
            <p className="text-[13px] leading-snug text-[var(--warn)]">
              Próximo {formatDate(dash.nextLandPayment.dueDate)} ·{" "}
              {formatMoney(
                dash.nextLandPayment.amountLocal,
                dash.nextLandPayment.currency,
              )}{" "}
              · {dash.nextLandPayment.landTicker}
            </p>
          )}
        </div>
      </section>

      <section className="animate-fade-in space-y-3">
        <h2 className="ios-title px-0.5">Distribución</h2>
        <div className="ios-group p-4">
          <AllocationChart
            data={dash.byClass}
            currency={cur}
            fx={fx}
          />
        </div>
      </section>

      {dash.holdings.length > 0 && (
        <section className="animate-fade-in space-y-3">
          <h2 className="ios-title px-0.5">Holdings</h2>
          <ul className="ios-group">
            {dash.holdings
              .slice()
              .sort((a, b) => b.marketValueUsd - a.marketValueUsd)
              .map((h) => (
                <li key={h.assetId} className="ios-row">
                  <div className="min-w-0">
                    <p className="ios-headline">{h.ticker}</p>
                    <p className="text-[13px] text-[var(--muted)]">
                      {formatQuantity(h.quantity)} · {classLabel(h.class)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="money text-[15px] font-semibold">
                      {money(h.marketValueUsd)}
                    </p>
                    {h.class === "land" || h.class === "cash" ? (
                      <p className="text-[13px] text-[var(--muted)]">
                        {h.class === "land" ? "al costo" : "saldo"}
                      </p>
                    ) : (
                      <p
                        className={`text-[13px] ${h.pnlPct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                      >
                        {formatPct(h.pnlPct)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="animate-fade-in space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
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
                <p className="ios-headline truncate">{tx.ticker}</p>
                <p className="text-[13px] text-[var(--muted)]">
                  {formatDate(tx.date)} · {txTypeLabel(tx.type)}
                </p>
              </div>
              <p className="money shrink-0 text-[15px] font-semibold">
                {money(tx.totalUsd)}
              </p>
            </li>
          ))}
        </ul>
      </section>
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
      className={`px-4 py-3.5 ${border ? "border-l border-[var(--separator)]" : ""} ${top ? "border-t border-[var(--separator)]" : ""}`}
    >
      <p className="text-[12px] font-medium text-[var(--muted)]">{label}</p>
      <p
        className={`money mt-1 text-[17px] font-semibold leading-tight ${
          tone === "pos"
            ? "text-[var(--positive)]"
            : tone === "neg"
              ? "text-[var(--negative)]"
              : "text-[var(--ink)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
