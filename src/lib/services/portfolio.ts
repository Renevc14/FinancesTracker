import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assets,
  fxRates,
  landContracts,
  landPayments,
  priceSnapshots,
  transactions,
  type AssetClass,
  type DisplayCurrency,
} from "@/lib/db/schema";

export type HoldingRow = {
  assetId: string;
  ticker: string;
  name: string;
  class: AssetClass;
  quantity: number;
  investedUsd: number;
  priceUsd: number | null;
  priceDate: string | null;
  marketValueUsd: number;
  pnlUsd: number;
  pnlPct: number;
};

export type ClassBreakdown = {
  class: AssetClass;
  investedUsd: number;
  marketValueUsd: number;
  weightPct: number;
};

export type DashboardKpis = {
  totalInvestedUsd: number;
  totalMarketValueUsd: number;
  pnlUsd: number;
  pnlPct: number;
  landPaidUsd: number;
  landCommittedUsd: number;
  landRemainingUsd: number;
  landEstimatedValueUsd: number;
  lastUpdated: string | null;
  holdings: HoldingRow[];
  byClass: ClassBreakdown[];
  recentTransactions: Array<{
    id: string;
    date: string;
    ticker: string;
    type: string;
    totalUsd: number;
  }>;
  nextLandPayment: {
    landTicker: string;
    dueDate: string;
    amountLocal: number;
    currency: string;
  } | null;
  displayCurrency: DisplayCurrency;
  fxToDisplay: number;
};

async function getLatestFx(
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return 1;
  const row = await db.query.fxRates.findFirst({
    where: and(eq(fxRates.fromCurrency, from), eq(fxRates.toCurrency, to)),
    orderBy: [desc(fxRates.date)],
  });
  if (row) return row.rate;

  const inverse = await db.query.fxRates.findFirst({
    where: and(eq(fxRates.fromCurrency, to), eq(fxRates.toCurrency, from)),
    orderBy: [desc(fxRates.date)],
  });
  if (inverse && inverse.rate !== 0) return 1 / inverse.rate;
  return 1;
}

export async function getDisplayFx(currency: DisplayCurrency): Promise<number> {
  if (currency === "USD") return 1;
  return getLatestFx("USD", currency);
}

export async function getPortfolioDashboard(): Promise<DashboardKpis> {
  const config = await db.query.userConfig.findFirst();
  const displayCurrency = config?.displayCurrency ?? "USD";
  const fxToDisplay = await getDisplayFx(displayCurrency);

  const allAssets = await db
    .select()
    .from(assets)
    .where(isNull(assets.deletedAt));

  const financialAssets = allAssets.filter((a) => a.class !== "land");
  const landAssets = allAssets.filter((a) => a.class === "land");

  const holdings: HoldingRow[] = [];

  for (const asset of financialAssets) {
    const txs = await db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.assetId, asset.id), isNull(transactions.deletedAt)),
      );

    let quantity = 0;
    let investedUsd = 0;

    for (const tx of txs) {
      if (tx.type === "buy" || tx.type === "transfer_in" || tx.type === "reward") {
        quantity += tx.quantity;
        if (tx.type === "buy") investedUsd += tx.totalUsd;
      } else if (tx.type === "sell" || tx.type === "transfer_out") {
        const costBasisPerUnit = quantity > 0 ? investedUsd / quantity : 0;
        quantity -= tx.quantity;
        if (tx.type === "sell") {
          investedUsd -= costBasisPerUnit * tx.quantity;
        }
      }
    }

    if (Math.abs(quantity) < 1e-12 && investedUsd === 0) continue;

    const latestPrice = await db.query.priceSnapshots.findFirst({
      where: eq(priceSnapshots.assetId, asset.id),
      orderBy: [desc(priceSnapshots.date)],
    });

    const priceUsd =
      latestPrice?.priceUsd ??
      (asset.class === "stable" ? 1 : null);
    const marketValueUsd = priceUsd !== null ? quantity * priceUsd : investedUsd;
    const pnlUsd = marketValueUsd - investedUsd;
    const pnlPct = investedUsd !== 0 ? (pnlUsd / investedUsd) * 100 : 0;

    holdings.push({
      assetId: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      class: asset.class,
      quantity,
      investedUsd,
      priceUsd,
      priceDate: latestPrice?.date ?? null,
      marketValueUsd,
      pnlUsd,
      pnlPct,
    });
  }

  const financialInvested = holdings.reduce((s, h) => s + h.investedUsd, 0);
  const financialValue = holdings.reduce((s, h) => s + h.marketValueUsd, 0);

  const contracts = await db
    .select()
    .from(landContracts)
    .where(isNull(landContracts.deletedAt));

  const payments = await db
    .select()
    .from(landPayments)
    .where(isNull(landPayments.deletedAt));

  const landPaidUsd = payments.reduce((s, p) => s + p.amountUsd, 0);

  const bobPerUsd = await getLatestFx("USD", "BOB");
  const landCommittedUsdConverted =
    bobPerUsd > 0
      ? contracts.reduce((s, c) => s + c.priceLocal / bobPerUsd, 0)
      : 0;

  const landEstimatedValueUsd = contracts.reduce(
    (s, c) => s + (c.estimatedValueUsd ?? c.priceLocal / (bobPerUsd || 1)),
    0,
  );
  const landRemainingUsd = Math.max(
    0,
    landCommittedUsdConverted - landPaidUsd,
  );

  for (const asset of landAssets) {
    const lotPays = payments.filter((p) => p.landAssetId === asset.id);
    const investedUsd = lotPays.reduce((s, p) => s + p.amountUsd, 0);
    if (investedUsd <= 0) continue;
    const contract = contracts.find((c) => c.landAssetId === asset.id);
    holdings.push({
      assetId: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      class: "land",
      quantity: contract?.surfaceM2 ?? 1,
      investedUsd,
      priceUsd: null,
      priceDate: lotPays[0]?.date ?? null,
      marketValueUsd: investedUsd,
      pnlUsd: 0,
      pnlPct: 0,
    });
  }

  // Lotes al costo: lo pagado (ahorro mensual) forma parte del valor estimado.
  // El saldo pendiente sigue en "comprometido", no infla el patrimonio.
  const totalInvestedUsd = financialInvested + landPaidUsd;
  const totalMarketValueUsd = financialValue + landPaidUsd;
  const pnlUsd = financialValue - financialInvested;
  const pnlPct =
    financialInvested !== 0 ? (pnlUsd / financialInvested) * 100 : 0;

  const classMap = new Map<AssetClass, { invested: number; value: number }>();
  for (const h of holdings) {
    const cur = classMap.get(h.class) ?? { invested: 0, value: 0 };
    cur.invested += h.investedUsd;
    cur.value += h.marketValueUsd;
    classMap.set(h.class, cur);
  }

  const byClass: ClassBreakdown[] = [...classMap.entries()].map(
    ([cls, v]) => ({
      class: cls,
      investedUsd: v.invested,
      marketValueUsd: v.value,
      weightPct:
        totalMarketValueUsd > 0
          ? (v.value / totalMarketValueUsd) * 100
          : 0,
    }),
  );

  const recent = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      type: transactions.type,
      totalUsd: transactions.totalUsd,
      ticker: assets.ticker,
    })
    .from(transactions)
    .innerJoin(assets, eq(transactions.assetId, assets.id))
    .where(isNull(transactions.deletedAt))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(8);

  // Next installment heuristic from contracts
  let nextLandPayment: DashboardKpis["nextLandPayment"] = null;
  for (const contract of contracts) {
    const asset = landAssets.find((a) => a.id === contract.landAssetId);
    if (!asset || !contract.paymentPlan.firstInstallmentDate) continue;
    const paidInstallments = payments.filter(
      (p) =>
        p.landAssetId === contract.landAssetId &&
        p.concept === "installment",
    ).length;
    if (paidInstallments >= contract.paymentPlan.installmentsCount) continue;

    const start = new Date(
      contract.paymentPlan.firstInstallmentDate + "T12:00:00",
    );
    const due = new Date(start);
    due.setMonth(due.getMonth() + paidInstallments);
    const dueDate = due.toISOString().slice(0, 10);

    if (
      !nextLandPayment ||
      dueDate < nextLandPayment.dueDate
    ) {
      nextLandPayment = {
        landTicker: asset.ticker,
        dueDate,
        amountLocal: contract.paymentPlan.installmentAmountLocal,
        currency: contract.priceCurrency,
      };
    }
  }

  const lastTx = recent[0]?.date ?? null;
  const lastPay = payments.sort((a, b) => b.date.localeCompare(a.date))[0]
    ?.date;
  const lastUpdated =
    [lastTx, lastPay].filter(Boolean).sort().reverse()[0] ?? null;

  return {
    totalInvestedUsd,
    totalMarketValueUsd,
    pnlUsd,
    pnlPct,
    landPaidUsd,
    landCommittedUsd: landCommittedUsdConverted,
    landRemainingUsd,
    landEstimatedValueUsd,
    lastUpdated,
    holdings,
    byClass,
    recentTransactions: recent,
    nextLandPayment,
    displayCurrency,
    fxToDisplay,
  };
}

export function convertFromUsd(amountUsd: number, fxToDisplay: number): number {
  return amountUsd * fxToDisplay;
}
