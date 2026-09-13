import Link from "next/link";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { CostValueChart } from "@/components/charts/cost-value-chart";
import { NavHistoryChart } from "@/components/charts/nav-history-chart";
import { SavingsRateChart } from "@/components/charts/savings-rate-chart";
import { RefreshMarketsButton } from "@/components/forms/refresh-markets-button";
import { Progress } from "@/components/ui/progress";
import { HoldingsList } from "@/components/holdings/holdings-list";
import { AssetLogo } from "@/components/ui/asset-logo";
import { txTypeLabel } from "@/lib/labels";
import { daysUntil } from "@/lib/services/market";
import { getPortfolioHistory } from "@/lib/services/history";
import { getSavingsSummary } from "@/lib/services/savings";
import {
  convertFromUsd,
  getPortfolioDashboard,
} from "@/lib/services/portfolio";
import { formatDate, formatMoney, formatPct, serializeForClient } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dash = serializeForClient(await getPortfolioDashboard());
  const history = serializeForClient(
    await getPortfolioHistory({
      valueUsd: dash.totalMarketValueUsd,
      investedUsd: dash.totalInvestedUsd,
    }),
  );
  const savings = serializeForClient(await getSavingsSummary());
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
            Lot due {landDueDays < 0 ? "overdue" : `in ${landDueDays}d`}
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

      <section className="space-y-3">
        <NavHistoryChart
          points={history}
          currentUsd={dash.totalMarketValueUsd}
          currency={cur}
          fx={fx}
        />
        <RefreshMarketsButton />
      </section>

      <CostValueChart points={history} currency={cur} fx={fx} />

      <SavingsRateChart summary={savings} currency={cur} fx={fx} />

      <section className="ios-group">
        <div className="grid grid-cols-2">
          <Kpi label="Cost" value={money(dash.totalInvestedUsd)} />
          <Kpi label="Value" value={money(dash.totalMarketValueUsd)} border />
          <Kpi
            label="P/L"
            value={money(dash.pnlUsd)}
            tone={pnlPositive ? "pos" : "neg"}
            top
          />
          <Kpi
            label="Return"
            value={formatPct(dash.pnlPct)}
            tone={pnlPositive ? "pos" : "neg"}
            border
            top
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="ios-title">Lots</h2>
          <Link
            href="/land"
            className="ios-pressable inline-flex min-h-11 items-center text-[17px] font-normal text-[var(--accent)]"
          >
            All
          </Link>
        </div>
        <div className="ios-group space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[15px] text-[var(--ink-soft)]">Paid</p>
            <p className="money text-[15px] font-semibold">
              {money(dash.landPaidUsd)}
              <span className="ml-1 font-normal text-[var(--muted)]">
                of {money(dash.landCommittedUsd)}
              </span>
            </p>
          </div>
          <Progress value={landPct} />
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[15px] text-[var(--ink-soft)]">Now</p>
            <p className="money text-[15px] font-semibold">
              {money(dash.landEquityUsd)}
            </p>
          </div>
          {Math.abs(dash.landEquityUsd - dash.landPaidUsd) >= 0.5 && (
            <p
              className={`text-[13px] ${
                dash.landEquityUsd >= dash.landPaidUsd
                  ? "text-[var(--positive)]"
                  : "text-[var(--negative)]"
              }`}
            >
              {dash.landEquityUsd >= dash.landPaidUsd ? "+" : "−"}
              {money(Math.abs(dash.landEquityUsd - dash.landPaidUsd))} vs paid
            </p>
          )}
          {dash.nextLandPayment && (
            <p className="text-[13px] leading-snug text-[var(--warn)]">
              Due {formatDate(dash.nextLandPayment.dueDate)} ·{" "}
              {formatMoney(
                dash.nextLandPayment.amountLocal,
                dash.nextLandPayment.currency,
              )}{" "}
              · {dash.nextLandPayment.landTicker}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="ios-title px-0.5">Allocation</h2>
        <div className="ios-group p-4">
          <AllocationChart data={dash.byClass} currency={cur} fx={fx} />
        </div>
      </section>

      {dash.holdings.length > 0 && (
        <section className="space-y-3">
          <h2 className="ios-title px-0.5">Holdings</h2>
          <HoldingsList
            holdings={dash.holdings}
            currency={cur}
            fx={fx}
          />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="ios-title">Activity</h2>
          <Link
            href="/transactions"
            className="ios-pressable inline-flex min-h-11 items-center text-[17px] font-normal text-[var(--accent)]"
          >
            All
          </Link>
        </div>
        <ul className="ios-group">
          {dash.recentTransactions.length === 0 && (
            <li className="px-4 py-6 text-center text-[15px] text-[var(--muted)]">
              None yet
            </li>
          )}
          {dash.recentTransactions.map((tx) => (
            <li key={tx.id} className="ios-row">
              <div className="flex min-w-0 items-center gap-3">
                <AssetLogo ticker={tx.ticker} size={32} />
                <div className="min-w-0">
                  <p className="ios-headline truncate">{tx.ticker}</p>
                  <p className="text-[13px] text-[var(--muted)]">
                    {formatDate(tx.date)} · {txTypeLabel(tx.type)}
                  </p>
                </div>
              </div>
              <p className="money shrink-0 text-[17px] font-semibold">
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
      <p className="text-[13px] font-medium text-[var(--muted)]">{label}</p>
      <p
        className={`money mt-1 text-[22px] font-semibold leading-tight ${
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
