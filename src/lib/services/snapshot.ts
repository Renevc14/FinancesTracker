import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assets,
  fxRates,
  landContracts,
  landPayments,
  monthlySnapshots,
  priceSnapshots,
  transactions,
  type PriceSource,
  type SnapshotByAsset,
  type SnapshotByClass,
} from "@/lib/db/schema";
import { getPortfolioDashboard } from "@/lib/services/portfolio";

export async function captureMonthlySnapshot(notes?: string) {
  const dash = await getPortfolioDashboard();
  const today = new Date();
  const snapshotDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const byClass: SnapshotByClass = {};
  for (const c of dash.byClass) {
    byClass[c.class] = {
      invested: c.investedUsd,
      value: c.marketValueUsd,
    };
  }

  const byAsset: SnapshotByAsset = {};
  for (const h of dash.holdings) {
    byAsset[h.assetId] = {
      ticker: h.ticker,
      class: h.class,
      quantity: h.quantity,
      invested: h.investedUsd,
      value: h.marketValueUsd,
    };
  }

  const monthPrefix = snapshotDate.slice(0, 7);
  const monthTx = await db
    .select()
    .from(transactions)
    .where(isNull(transactions.deletedAt));
  const monthPay = await db
    .select()
    .from(landPayments)
    .where(isNull(landPayments.deletedAt));

  const monthlyContributionUsd =
    monthTx
      .filter((t) => t.date.startsWith(monthPrefix) && t.type === "buy")
      .reduce((s, t) => s + t.totalUsd, 0) +
    monthPay
      .filter((p) => p.date.startsWith(monthPrefix))
      .reduce((s, p) => s + p.amountUsd, 0);

  const existing = await db.query.monthlySnapshots.findFirst({
    where: eq(monthlySnapshots.snapshotDate, snapshotDate),
  });

  if (existing) {
    const [updated] = await db
      .update(monthlySnapshots)
      .set({
        totalInvestedUsd: dash.totalInvestedUsd,
        totalMarketValueUsd: dash.totalMarketValueUsd,
        byClass,
        byAsset,
        landCommittedUsd: dash.landCommittedUsd,
        landPaidUsd: dash.landPaidUsd,
        landRemainingUsd: dash.landRemainingUsd,
        monthlyContributionUsd,
        notes: notes ?? existing.notes,
      })
      .where(eq(monthlySnapshots.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(monthlySnapshots)
    .values({
      snapshotDate,
      totalInvestedUsd: dash.totalInvestedUsd,
      totalMarketValueUsd: dash.totalMarketValueUsd,
      byClass,
      byAsset,
      landCommittedUsd: dash.landCommittedUsd,
      landPaidUsd: dash.landPaidUsd,
      landRemainingUsd: dash.landRemainingUsd,
      monthlyContributionUsd,
      notes: notes ?? null,
    })
    .returning();

  return created;
}

export async function listSnapshots() {
  return db
    .select()
    .from(monthlySnapshots)
    .orderBy(desc(monthlySnapshots.snapshotDate));
}

export async function getSnapshot(date: string) {
  return db.query.monthlySnapshots.findFirst({
    where: eq(monthlySnapshots.snapshotDate, date),
  });
}

export async function getLatestFxRate(from: string, to: string) {
  if (from === to) return 1;
  const row = await db.query.fxRates.findFirst({
    where: and(eq(fxRates.fromCurrency, from), eq(fxRates.toCurrency, to)),
    orderBy: [desc(fxRates.date)],
  });
  return row?.rate ?? null;
}

export async function upsertFxRate(input: {
  date: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source?: "manual" | "api_exchangerate" | "paralelo_manual";
}) {
  const existing = await db.query.fxRates.findFirst({
    where: and(
      eq(fxRates.fromCurrency, input.fromCurrency),
      eq(fxRates.toCurrency, input.toCurrency),
      eq(fxRates.date, input.date),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(fxRates)
      .set({
        rate: input.rate,
        source: input.source ?? "manual",
      })
      .where(eq(fxRates.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(fxRates)
    .values({
      date: input.date,
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      rate: input.rate,
      source: input.source ?? "manual",
    })
    .returning();
  return created;
}

export async function upsertPriceSnapshot(input: {
  assetId: string;
  date: string;
  priceUsd: number;
  source?: PriceSource;
}) {
  const existing = await db.query.priceSnapshots.findFirst({
    where: and(
      eq(priceSnapshots.assetId, input.assetId),
      eq(priceSnapshots.date, input.date),
    ),
  });
  if (existing) {
    const [updated] = await db
      .update(priceSnapshots)
      .set({
        priceUsd: input.priceUsd,
        source: input.source ?? existing.source,
      })
      .where(eq(priceSnapshots.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(priceSnapshots)
    .values({
      assetId: input.assetId,
      date: input.date,
      priceUsd: input.priceUsd,
      source: input.source ?? "manual",
    })
    .returning();
  return created;
}

export async function listAssets() {
  return db
    .select()
    .from(assets)
    .where(isNull(assets.deletedAt))
    .orderBy(assets.class, assets.ticker);
}

export async function listLandContracts() {
  return db.select().from(landContracts).where(isNull(landContracts.deletedAt));
}
