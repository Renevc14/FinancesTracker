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
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = landPaymentFormSchema.safeParse({
    date: formData.get("date"),
    landAssetId: formData.get("landAssetId"),
    concept: formData.get("concept"),
    installmentNumber: formData.get("installmentNumber") || null,
    amountLocal: formData.get("amountLocal"),
    localCurrency: formData.get("localCurrency") || "BOB",
    fxRate: formData.get("fxRate"),
    paymentMethod: formData.get("paymentMethod"),
    discountLocal: formData.get("discountLocal"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const receiptRaw = formData.get("receipt");
  const receipt =
    receiptRaw instanceof File && receiptRaw.size > 0 ? receiptRaw : null;
  try {
    const row = await createLandPayment(parsed.data, receipt);
    revalidatePath("/dashboard");
    revalidatePath("/land");
    revalidatePath("/pagos/nuevo");
    revalidatePath(`/land/${parsed.data.landAssetId}`);
    return { ok: true, data: { id: row.id } };
  } catch (err) {
    console.error("[createLandPaymentAction]", err);
    const message =
      err instanceof Error ? err.message : "No se pudo guardar el pago";
    return { ok: false, error: message };
  }
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

export async function saveApiCredentialAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const provider = String(formData.get("provider") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const apiSecret = String(formData.get("apiSecret") ?? "").trim();
  const flexQueryId = String(formData.get("flexQueryId") ?? "").trim();
  if (provider !== "binance" && provider !== "ibkr_flex" && provider !== "kraken") {
    return { ok: false, error: "Provider no soportado" };
  }
  if (!label || !apiKey || !apiSecret) {
    return { ok: false, error: "Completa label, key y secret/token" };
  }
  const { encryptSecret } = await import("@/lib/crypto/encryption");
  const { apiCredentials } = await import("@/lib/db/schema");
  const [row] = await db
    .insert(apiCredentials)
    .values({
      provider,
      label,
      apiKeyCipher: encryptSecret(apiKey),
      apiSecretCipher: encryptSecret(apiSecret),
      additionalConfig: flexQueryId ? { flex_query_id: flexQueryId } : {},
    })
    .returning();
  if (!row) return { ok: false, error: "No se pudo guardar la credencial" };
  revalidatePath("/settings/credentials");
  revalidatePath("/sync");
  return { ok: true, data: { id: row.id } };
}

export async function runManualSyncAction(
  credentialId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { runSync } = await import("@/lib/exchanges/sync-manager");
    const id = await runSync(credentialId, "manual");
    revalidatePath("/sync");
    revalidatePath("/reconciliation");
    revalidatePath("/dashboard");
    return { ok: true, data: { id } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync falló",
    };
  }
}

export async function resolveDriftAction(
  logId: string,
  action: "ignored" | "investigated" | "accepted_api",
): Promise<ActionResult> {
  try {
    if (action === "accepted_api") {
      const { acceptApiAsTruth } = await import("@/lib/exchanges/sync-manager");
      await acceptApiAsTruth(logId);
      revalidatePath("/reconciliation");
      revalidatePath("/dashboard");
      revalidatePath("/transactions");
      return { ok: true, data: undefined };
    }
    const { reconciliationLogs } = await import("@/lib/db/schema");
    await db
      .update(reconciliationLogs)
      .set({
        resolved: true,
        resolutionAction: action,
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(reconciliationLogs.id, logId));
    revalidatePath("/reconciliation");
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo resolver",
    };
  }
}

export async function refreshMarketsAction(): Promise<
  ActionResult<{ prices: number; fx: number }>
> {
  try {
    const { refreshLiveMarkets } = await import("@/lib/services/market");
    const result = await refreshLiveMarkets();
    revalidatePath("/dashboard");
    revalidatePath("/settings/fx");
    revalidatePath("/settings/assets");
    if (result.errors.length && result.prices === 0 && result.fx === 0) {
      return { ok: false, error: result.errors[0] ?? "Refresh falló" };
    }
    return { ok: true, data: { prices: result.prices, fx: result.fx } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Refresh falló",
    };
  }
}

export async function createBankAccountAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const name = String(formData.get("name") ?? "").trim();
  const bank = String(formData.get("bank") ?? "").trim();
  const currency = String(formData.get("currency") ?? "BOB").trim() || "BOB";
  const accountType =
    formData.get("accountType") === "savings" ? "savings" : "checking";
  if (!name || !bank) return { ok: false, error: "Nombre y banco son obligatorios" };
  try {
    const { createBankAccount } = await import("@/lib/services/banks");
    const row = await createBankAccount({ name, bank, currency, accountType });
    revalidatePath("/settings/banks");
    return { ok: true, data: { id: row.id } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo crear la cuenta",
    };
  }
}

export async function addBankBalanceAction(formData: FormData): Promise<ActionResult> {
  const accountId = String(formData.get("accountId") ?? "");
  const balanceLocal = Number(formData.get("balanceLocal"));
  if (!accountId || !Number.isFinite(balanceLocal)) {
    return { ok: false, error: "Saldo inválido" };
  }
  try {
    const { addBankBalance } = await import("@/lib/services/banks");
    await addBankBalance({ accountId, balanceLocal });
    revalidatePath("/settings/banks");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo guardar el saldo",
    };
  }
}

export async function saveFireConfigAction(formData: FormData): Promise<ActionResult> {
  const target = Number(formData.get("fireTargetAmount"));
  const monthly = Number(formData.get("fireExpectedContribution"));
  const ret = Number(formData.get("fireExpectedReturn"));
  const date = String(formData.get("fireTargetDate") ?? "").trim() || null;
  if (!Number.isFinite(target) || target <= 0) {
    return { ok: false, error: "Meta inválida" };
  }
  await db
    .update(userConfig)
    .set({
      fireTargetAmount: target,
      fireExpectedContribution: Number.isFinite(monthly) ? monthly : 2000,
      fireExpectedReturn: Number.isFinite(ret) ? ret : 0.07,
      fireTargetDate: date,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userConfig.id, "default"));
  revalidatePath("/fire");
  return { ok: true, data: undefined };
}
