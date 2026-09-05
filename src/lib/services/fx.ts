import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fxRates, type FxSource } from "@/lib/db/schema";

// Thin FX layer — daily API fetch lands in Phase 2 (FR-06).

/** Latest FX rate from → to. Returns 1 for identical currencies. */
export async function getLatestFxRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;

  const direct = await db.query.fxRates.findFirst({
    where: and(
      eq(fxRates.fromCurrency, fromCurrency),
      eq(fxRates.toCurrency, toCurrency),
    ),
    orderBy: [desc(fxRates.date)],
  });
  if (direct) return direct.rate;

  const inverse = await db.query.fxRates.findFirst({
    where: and(
      eq(fxRates.fromCurrency, toCurrency),
      eq(fxRates.toCurrency, fromCurrency),
    ),
    orderBy: [desc(fxRates.date)],
  });
  if (inverse && inverse.rate !== 0) return 1 / inverse.rate;
  return null;
}

export async function listRecentFxRates(limit = 50) {
  return db
    .select()
    .from(fxRates)
    .orderBy(desc(fxRates.date), desc(fxRates.createdAt))
    .limit(limit);
}

export async function upsertFxRate(input: {
  date: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source?: FxSource;
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
