import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  apiCredentials,
  assets,
  reconciliationLogs,
  syncJobs,
  syncLogs,
  transactions,
} from "@/lib/db/schema";
import { decryptSecret } from "@/lib/crypto/encryption";
import { getPortfolioDashboard } from "@/lib/services/portfolio";
import { BinanceClient } from "./binance";
import { IbkrFlexClient } from "./ibkr";
import { KrakenClient } from "./kraken";
import type { ExchangeClient, Trade } from "./types";

const locks = new Set<string>();

function clientFor(
  provider: string,
  apiKey: string,
  apiSecret: string,
  extra: Record<string, string> | null,
): ExchangeClient {
  if (provider === "binance") return new BinanceClient(apiKey, apiSecret);
  if (provider === "kraken") return new KrakenClient(apiKey, apiSecret);
  if (provider === "ibkr_flex") {
    const queryId = extra?.flex_query_id ?? extra?.flexQueryId ?? "";
    return new IbkrFlexClient(apiKey, queryId || apiSecret);
  }
  throw new Error(`Provider ${provider} no soportado`);
}

function baseFromSymbol(symbol: string): string {
  for (const quote of ["USDT", "USDC", "BUSD", "FDUSD", "EUR"]) {
    if (symbol.endsWith(quote) && symbol.length > quote.length) {
      return symbol.slice(0, -quote.length);
    }
  }
  return symbol;
}

export async function runSync(
  credentialId: string,
  triggeredBy: "cron" | "manual" | "onboarding",
) {
  if (locks.has(credentialId)) {
    throw new Error("Ya hay un sync en curso para esta credencial");
  }
  locks.add(credentialId);

  const [cred] = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.id, credentialId))
    .limit(1);
  if (!cred || !cred.active) {
    locks.delete(credentialId);
    throw new Error("Credencial no encontrada o inactiva");
  }

  const [job] = await db
    .insert(syncJobs)
    .values({
      credentialId,
      triggeredBy,
      status: "running",
    })
    .returning();

  try {
    const apiKey = decryptSecret(cred.apiKeyCipher);
    const apiSecret = decryptSecret(cred.apiSecretCipher);
    const extra = (cred.additionalConfig ?? {}) as Record<string, string>;
    const client = clientFor(cred.provider, apiKey, apiSecret, extra);
    const test = await client.testConnection();
    await db.insert(syncLogs).values({
      syncJobId: job.id,
      level: test.ok ? "info" : "error",
      message: test.ok ? "Conexión OK" : (test.error ?? "Fallo de conexión"),
    });

    if (!test.ok) {
      await db
        .update(syncJobs)
        .set({
          status: "failed",
          finishedAt: new Date().toISOString(),
          errors: [test.error ?? "testConnection failed"],
        })
        .where(eq(syncJobs.id, job.id));
      await db
        .update(apiCredentials)
        .set({
          lastVerifiedAt: new Date().toISOString(),
          lastVerificationStatus: "invalid",
        })
        .where(eq(apiCredentials.id, cred.id));
      return job.id;
    }

    const balances = await client.getBalances();
    const dash = await getPortfolioDashboard();
    const threshold =
      (await db.query.userConfig.findFirst())?.reconciliationDriftThreshold ??
      0.005;

    let warnings = 0;
    for (const b of balances) {
      const holding = dash.holdings.find(
        (h) => h.ticker.toUpperCase() === b.asset.toUpperCase(),
      );
      const asset = await db.query.assets.findFirst({
        where: eq(assets.ticker, b.asset),
      });
      if (!asset) continue;
      const apiBal = Number(b.total);
      const dbBal = holding?.quantity ?? 0;
      const driftAbs = Math.abs(apiBal - dbBal);
      const driftPct = apiBal !== 0 ? driftAbs / apiBal : driftAbs > 0 ? 1 : 0;
      const status =
        driftPct > 0.05 ? "critical" : driftPct > threshold ? "warning" : "ok";
      if (status !== "ok") warnings += 1;
      await db.insert(reconciliationLogs).values({
        syncJobId: job.id,
        assetId: asset.id,
        apiBalance: apiBal,
        dbBalance: dbBal,
        driftAbsolute: driftAbs,
        driftPct,
        status,
      });
    }

    let recordsNew = 0;
    let recordsDuplicate = 0;
    if (client.getTrades) {
      const trades = await client.getTrades();
      const imported = await importTrades(cred.provider, trades);
      recordsNew = imported.newCount;
      recordsDuplicate = imported.dupCount;
      await db.insert(syncLogs).values({
        syncJobId: job.id,
        level: "info",
        message: `Trades: ${imported.newCount} nuevas, ${imported.dupCount} duplicadas`,
      });
    }

    await db
      .update(syncJobs)
      .set({
        status: warnings > 0 ? "partial" : "success",
        finishedAt: new Date().toISOString(),
        recordsFetched: balances.length,
        recordsNew,
        recordsDuplicate,
      })
      .where(eq(syncJobs.id, job.id));
    await db
      .update(apiCredentials)
      .set({
        lastVerifiedAt: new Date().toISOString(),
        lastVerificationStatus: "ok",
      })
      .where(eq(apiCredentials.id, cred.id));
    return job.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await db.insert(syncLogs).values({
      syncJobId: job.id,
      level: "error",
      message,
    });
    await db
      .update(syncJobs)
      .set({
        status: "failed",
        finishedAt: new Date().toISOString(),
        errors: [message],
      })
      .where(eq(syncJobs.id, job.id));
    throw err;
  } finally {
    locks.delete(credentialId);
  }
}

async function importTrades(provider: string, trades: Trade[]) {
  let newCount = 0;
  let dupCount = 0;
  const source = `${provider}_api`;
  for (const trade of trades) {
    const ticker = baseFromSymbol(trade.symbol);
    const asset = await db.query.assets.findFirst({
      where: eq(assets.ticker, ticker),
    });
    if (!asset || asset.class === "land") continue;
    const qty = Number(trade.quantity);
    const price = Number(trade.price);
    const total = Number(trade.quoteQuantity) || qty * price;
    if (!Number.isFinite(qty) || qty === 0) continue;
    const date = trade.timestamp.toISOString().slice(0, 10);
    try {
      await db.insert(transactions).values({
        date,
        assetId: asset.id,
        type: trade.side === "buy" ? "buy" : "sell",
        quantity: qty,
        unitPrice: price,
        priceCurrency: "USD",
        fxRate: 1,
        totalUsd: total,
        platform: provider,
        notes: `API ${trade.symbol}`,
        importedFrom: source,
        importRef: trade.externalId,
      });
      newCount += 1;
    } catch {
      dupCount += 1;
    }
  }
  return { newCount, dupCount };
}

export async function listSyncJobs(limit = 20) {
  return db.select().from(syncJobs).orderBy(desc(syncJobs.startedAt)).limit(limit);
}

export async function listOpenDrifts() {
  return db
    .select()
    .from(reconciliationLogs)
    .where(eq(reconciliationLogs.resolved, false))
    .orderBy(desc(reconciliationLogs.createdAt));
}

export async function acceptApiAsTruth(logId: string) {
  const log = await db.query.reconciliationLogs.findFirst({
    where: eq(reconciliationLogs.id, logId),
  });
  if (!log || log.resolved) throw new Error("Drift no encontrado");
  const delta = log.apiBalance - log.dbBalance;
  if (Math.abs(delta) > 1e-12) {
    await db.insert(transactions).values({
      date: new Date().toISOString().slice(0, 10),
      assetId: log.assetId,
      type: "adjustment",
      quantity: delta,
      unitPrice: 0,
      priceCurrency: "USD",
      fxRate: 1,
      totalUsd: 0,
      platform: "reconciliation",
      notes: "Aceptado balance API",
      importedFrom: "reconciliation",
      importRef: log.id,
    });
  }
  await db
    .update(reconciliationLogs)
    .set({
      resolved: true,
      resolutionAction: "accepted_api",
      resolvedAt: new Date().toISOString(),
    })
    .where(eq(reconciliationLogs.id, logId));
}
