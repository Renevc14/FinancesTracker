"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  assets,
  transactions,
  userConfig,
  type DisplayCurrency,
} from "@/lib/db/schema";
import {
  assetFormSchema,
  landPaymentFormSchema,
  transactionFormSchema,
} from "@/lib/validators";
import { createLandPayment } from "@/lib/services/land";
import {
  captureMonthlySnapshot,
  upsertFxRate,
  upsertPriceSnapshot,
} from "@/lib/services/snapshot";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createTransactionAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = transactionFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      };
    }
    const v = parsed.data;

    if (v.date > new Date().toISOString().slice(0, 10)) {
      return { ok: false, error: "La fecha no puede ser futura" };
    }
    if (v.fxRate <= 0 || !Number.isFinite(v.fxRate)) {
      return { ok: false, error: "FX inválido" };
    }
    if (v.quantity <= 0 || v.unitPrice < 0) {
      return { ok: false, error: "Cantidad/precio inválidos" };
    }

    const asset = await db.query.assets.findFirst({
      where: and(eq(assets.id, v.assetId), isNull(assets.deletedAt)),
    });
    if (!asset) {
      return { ok: false, error: "Activo no encontrado" };
    }
    if (asset.class === "land") {
      return {
        ok: false,
        error: "Usa el módulo de terrenos para pagos de land",
      };
    }

    const totalUsd =
      v.priceCurrency === "USD"
        ? v.quantity * v.unitPrice
        : (v.quantity * v.unitPrice) / v.fxRate;
    if (!Number.isFinite(totalUsd)) {
      return { ok: false, error: "Total USD no calculable" };
    }

    const [row] = await db
      .insert(transactions)
      .values({
        date: v.date,
        assetId: v.assetId,
        type: v.type,
        quantity: v.quantity,
        unitPrice: v.unitPrice,
        priceCurrency: v.priceCurrency,
        fxRate: v.fxRate,
        totalUsd,
        platform: v.platform,
        notes: v.notes || null,
        importedFrom: "manual",
        importRef: crypto.randomUUID(),
      })
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { ok: true, data: { id: row.id } };
  } catch (err) {
    console.error("[createTransactionAction]", err);
    return { ok: false, error: "No se pudo guardar la transacción" };
  }
}

export async function deleteTransactionAction(
  id: string,
): Promise<ActionResult> {
  if (!id || typeof id !== "string") {
    return { ok: false, error: "ID inválido" };
  }
  try {
    await db
      .update(transactions)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)));
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[deleteTransactionAction]", err);
    return { ok: false, error: "No se pudo eliminar" };
  }
}

export async function createLandPaymentAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = landPaymentFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const row = await createLandPayment(parsed.data);
  revalidatePath("/dashboard");
  revalidatePath("/land");
  revalidatePath(`/land/${parsed.data.landAssetId}`);
  return { ok: true, data: { id: row.id } };
}

export async function createAssetAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = assetFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const [row] = await db
    .insert(assets)
    .values({
      ticker: parsed.data.ticker.toUpperCase(),
      name: parsed.data.name,
      class: parsed.data.class,
      currencyBase: parsed.data.currencyBase,
      metadata: {},
    })
    .returning();
  revalidatePath("/settings/assets");
  revalidatePath("/transactions/new");
  return { ok: true, data: { id: row.id } };
}

export async function captureSnapshotAction(
  notes?: string,
): Promise<ActionResult<{ date: string }>> {
  const snap = await captureMonthlySnapshot(notes);
  revalidatePath("/snapshots");
  revalidatePath("/dashboard");
  return { ok: true, data: { date: snap.snapshotDate } };
}

export async function setDisplayCurrencyAction(
  currency: DisplayCurrency,
): Promise<ActionResult> {
  await db
    .update(userConfig)
    .set({
      displayCurrency: currency,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userConfig.id, "default"));
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function saveFxRateAction(raw: {
  date: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}): Promise<ActionResult> {
  await upsertFxRate(raw);
  revalidatePath("/settings/fx");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function savePriceAction(raw: {
  assetId: string;
  date: string;
  priceUsd: number;
}): Promise<ActionResult> {
  await upsertPriceSnapshot(raw);
  revalidatePath("/dashboard");
  revalidatePath("/settings/assets");
  return { ok: true, data: undefined };
}

export async function listTransactionsAction() {
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      type: transactions.type,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
      priceCurrency: transactions.priceCurrency,
      fxRate: transactions.fxRate,
      totalUsd: transactions.totalUsd,
      platform: transactions.platform,
      notes: transactions.notes,
      ticker: assets.ticker,
      assetClass: assets.class,
    })
    .from(transactions)
    .innerJoin(assets, eq(transactions.assetId, assets.id))
    .where(and(isNull(transactions.deletedAt), isNull(assets.deletedAt)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}
