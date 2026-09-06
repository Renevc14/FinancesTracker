import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  apiCredentials,
  assets,
  cryptoLoans,
  reconciliationLogs,
  syncJobs,
  syncLogs,
  transactions,
  walletSnapshots,
} from "@/lib/db/schema";
import { decryptSecret } from "@/lib/crypto/encryption";
import { getPortfolioDashboard } from "@/lib/services/portfolio";
import {
  BinanceClient,
  PORTFOLIO_START_DATE,
  binanceSpotSymbolsFor,
} from "./binance";
import { IbkrFlexClient } from "./ibkr";
import { KrakenClient } from "./kraken";
import type {
  ExchangeClient,
  LoanPosition,
  RewardEvent,
  Trade,
  WalletBreakdown,
} from "./types";

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

    let recordsNew = 0;
    let recordsDuplicate = 0;
    let recordsFetched = balances.length;
    if (client.getTrades) {
      const cryptoTickers = (
        await db
          .select({ ticker: assets.ticker })
          .from(assets)
          .where(and(eq(assets.class, "crypto"), isNull(assets.deletedAt)))
      ).map((a) => a.ticker);
      const symbols =
        cred.provider === "binance"
          ? binanceSpotSymbolsFor(cryptoTickers)
          : cryptoTickers.map((t) => `${t}USDT`);
      const trades = await client.getTrades(symbols);
      recordsFetched = trades.length + balances.length;
      const imported = await importTrades(cred.provider, trades);
      recordsNew = imported.newCount;
      recordsDuplicate = imported.dupCount;
      let superseded = 0;
      let archivedOld = 0;
      if (cred.provider === "binance") {
        superseded = await supersedeNonApiSpotLedger(imported.touchedAssetIds);
        archivedOld = await archiveBinanceApiTradesBefore(PORTFOLIO_START_DATE);
      }
      const emptyNote =
        cred.provider === "binance" && trades.length === 0
          ? " Sin fills Spot desde el inicio del portafolio: se mantienen las compras locales."
          : "";
      await db.insert(syncLogs).values({
        syncJobId: job.id,
        level: trades.length === 0 && cred.provider === "binance" ? "warn" : "info",
        message: `Trades desde ${PORTFOLIO_START_DATE}: ${imported.newCount} nuevas, ${imported.dupCount} duplicadas, ${superseded} locales sustituidas, ${archivedOld} fills anteriores archivados. Pares: ${symbols.join(", ")}.${emptyNote}`,
      });
    }

    let custodyWallets: WalletBreakdown[] = balances.map((b) => ({
      asset: b.asset.toUpperCase(),
      spot: Number(b.total),
      earn: 0,
      funding: 0,
      collateral: 0,
      total: Number(b.total),
    }));

    if (cred.provider === "binance") {
      const custody = await (client as BinanceClient).getCustodySnapshot(balances);
      custodyWallets = custody.wallets;
      recordsFetched += custody.rewards.length + custody.loans.length;
      const rewardsImported = await importRewards(custody.rewards);
      recordsNew += rewardsImported.newCount;
      recordsDuplicate += rewardsImported.dupCount;
      await persistLoans(custody.loans);
      await persistWallets(custody.wallets);
      await db.insert(syncLogs).values({
        syncJobId: job.id,
        level: custody.warnings.length > 0 ? "warn" : "info",
        message: `Custodia: ${custody.wallets.length} activos, ${custody.loans.length} préstamos, Earn ${rewardsImported.newCount} nuevas / ${rewardsImported.dupCount} duplicadas.${custody.warnings.length ? `Avisos: ${custody.warnings.join(" · ")}` : ""}`,
      });
    }

    const dash = await getPortfolioDashboard();
    const threshold =
      (await db.query.userConfig.findFirst())?.reconciliationDriftThreshold ??
      0.005;

    let warnings = 0;
    const reconAssets = new Set(
      custodyWallets.map((w) => w.asset).concat(
        dash.holdings
          .filter((h) => h.class === "crypto" || h.class === "stable")
          .map((h) => h.ticker.toUpperCase()),
      ),
    );
    for (const ticker of reconAssets) {
      const wallet = custodyWallets.find((w) => w.asset === ticker);
      const holding = dash.holdings.find(
        (h) => h.ticker.toUpperCase() === ticker,
      );
      const asset = await db.query.assets.findFirst({
        where: and(eq(assets.ticker, ticker), isNull(assets.deletedAt)),
      });
      if (!asset) continue;
      const apiBal = wallet?.total ?? 0;
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

    await db
      .update(syncJobs)
      .set({
        status: warnings > 0 ? "partial" : "success",
        finishedAt: new Date().toISOString(),
        recordsFetched,
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
  const touchedAssetIds = new Set<string>();
  for (const trade of trades) {
    const ticker = baseFromSymbol(trade.symbol);
    const asset = await db.query.assets.findFirst({
      where: and(eq(assets.ticker, ticker), isNull(assets.deletedAt)),
    });
    if (!asset || asset.class !== "crypto") continue;
    const qty = Number(trade.quantity);
    const price = Number(trade.price);
    const total = Number(trade.quoteQuantity) || qty * price;
    if (!Number.isFinite(qty) || qty === 0) continue;
    const date = trade.timestamp.toISOString().slice(0, 10);
    if (
      provider === "binance" &&
      date < PORTFOLIO_START_DATE
    ) {
      continue;
    }
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
      touchedAssetIds.add(asset.id);
    } catch {
      dupCount += 1;
      touchedAssetIds.add(asset.id);
    }
  }
  return { newCount, dupCount, touchedAssetIds };
}

async function supersedeNonApiSpotLedger(assetIds: Set<string>) {
  if (assetIds.size === 0) return 0;
  const now = new Date().toISOString();
  const rows = await db
    .update(transactions)
    .set({ deletedAt: now })
    .where(
      and(
        inArray(transactions.assetId, [...assetIds]),
        inArray(transactions.type, ["buy", "sell"]),
        isNull(transactions.deletedAt),
        or(
          isNull(transactions.importedFrom),
          ne(transactions.importedFrom, "binance_api"),
          sql`${transactions.importRef} not like '%:%'`,
        ),
      ),
    )
    .returning({ id: transactions.id });
  return rows.length;
}

async function archiveBinanceApiTradesBefore(startDate: string) {
  const now = new Date().toISOString();
  const rows = await db
    .update(transactions)
    .set({ deletedAt: now })
    .where(
      and(
        eq(transactions.importedFrom, "binance_api"),
        inArray(transactions.type, ["buy", "sell"]),
        isNull(transactions.deletedAt),
        lt(transactions.date, startDate),
      ),
    )
    .returning({ id: transactions.id });
  return rows.length;
}

async function importRewards(rewards: RewardEvent[]) {
  let newCount = 0;
  let dupCount = 0;
  for (const reward of rewards) {
    const asset = await db.query.assets.findFirst({
      where: and(eq(assets.ticker, reward.asset), isNull(assets.deletedAt)),
    });
    if (!asset) continue;
    const qty = Number(reward.amount);
    if (!Number.isFinite(qty) || qty === 0) continue;
    const date = reward.timestamp.toISOString().slice(0, 10);
    if (date < PORTFOLIO_START_DATE) continue;
    try {
      await db.insert(transactions).values({
        date,
        assetId: asset.id,
        type: "reward",
        quantity: qty,
        unitPrice: 0,
        priceCurrency: "USD",
        fxRate: 1,
        totalUsd: 0,
        platform: "binance",
        notes: `Earn ${reward.source}`,
        importedFrom: "binance_earn",
        importRef: reward.externalId,
      });
      newCount += 1;
    } catch {
      dupCount += 1;
    }
  }
  return { newCount, dupCount };
}

async function persistLoans(loans: LoanPosition[]) {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  for (const loan of loans) {
    seen.add(loan.externalRef);
    const [existing] = await db
      .select()
      .from(cryptoLoans)
      .where(
        and(
          eq(cryptoLoans.provider, "binance"),
          eq(cryptoLoans.externalRef, loan.externalRef),
        ),
      )
      .limit(1);
    const values = {
      product: loan.product,
      loanCoin: loan.loanCoin,
      totalDebt: loan.totalDebt,
      collateralCoin: loan.collateralCoin,
      collateralAmount: loan.collateralAmount,
      currentLtv: loan.currentLtv,
      status: "ongoing" as const,
      deletedAt: null,
      updatedAt: now,
    };
    if (existing) {
      await db
        .update(cryptoLoans)
        .set(values)
        .where(eq(cryptoLoans.id, existing.id));
    } else {
      await db.insert(cryptoLoans).values({
        provider: "binance",
        externalRef: loan.externalRef,
        ...values,
      });
    }
  }
  const open = await db
    .select()
    .from(cryptoLoans)
    .where(
      and(
        eq(cryptoLoans.provider, "binance"),
        eq(cryptoLoans.status, "ongoing"),
        isNull(cryptoLoans.deletedAt),
      ),
    );
  for (const row of open) {
    if (seen.has(row.externalRef)) continue;
    await db
      .update(cryptoLoans)
      .set({ status: "repaid", deletedAt: now, updatedAt: now })
      .where(eq(cryptoLoans.id, row.id));
  }
}

async function persistWallets(wallets: WalletBreakdown[]) {
  const now = new Date().toISOString();
  await db.delete(walletSnapshots).where(eq(walletSnapshots.provider, "binance"));
  if (wallets.length === 0) return;
  await db.insert(walletSnapshots).values(
    wallets.map((w) => ({
      provider: "binance",
      asset: w.asset,
      spot: w.spot,
      earn: w.earn,
      funding: w.funding,
      collateral: w.collateral,
      total: w.total,
      capturedAt: now,
    })),
  );
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
