import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assets,
  bankAccounts,
  bankBalanceSnapshots,
  cryptoLoans,
  landPayments,
  priceSnapshots,
  transactions,
} from "@/lib/db/schema";
import { PORTFOLIO_START_DATE } from "@/lib/exchanges/binance";
import { upsertPriceSnapshot } from "@/lib/services/snapshot";
import { localISODate } from "@/lib/utils";

const GECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
};

const YAHOO_SYMBOLS: Record<string, string> = {
  VUAA: "VUAA.L",
};

const STABLE = new Set(["USDT", "USDC", "BUSD", "FDUSD", "USD"]);

export type NavHistoryPoint = {
  date: string;
  valueUsd: number;
  investedUsd: number;
};

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localISODate(d);
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

function priceOnOrBefore(
  series: Array<{ date: string; priceUsd: number }>,
  date: string,
): number | null {
  let best: number | null = null;
  for (const row of series) {
    if (row.date > date) break;
    best = row.priceUsd;
  }
  return best;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fillHistoricalPrices(): Promise<void> {
  const catalog = await db
    .select()
    .from(assets)
    .where(isNull(assets.deletedAt));
  const txs = await db
    .select({ assetId: transactions.assetId })
    .from(transactions)
    .where(isNull(transactions.deletedAt));
  const used = new Set(txs.map((t) => t.assetId));
  const existing = await db.select().from(priceSnapshots);
  const datesByAsset = new Map<string, Set<string>>();
  for (const row of existing) {
    const set = datesByAsset.get(row.assetId) ?? new Set();
    set.add(row.date);
    datesByAsset.set(row.assetId, set);
  }

  await Promise.all(
    catalog.map(async (asset) => {
      if (!used.has(asset.id)) return;
      const gecko = GECKO_IDS[asset.ticker];
      const yahoo = YAHOO_SYMBOLS[asset.ticker];
      if (!gecko && !yahoo) return;
      const have = datesByAsset.get(asset.id) ?? new Set();
      if (have.size >= 40) return;

      try {
        if (gecko) {
          const data = (await fetchJson(
            `https://api.coingecko.com/api/v3/coins/${gecko}/market_chart?vs_currency=usd&days=365`,
          )) as { prices?: Array<[number, number]> };
          for (const [ms, price] of data.prices ?? []) {
            if (!Number.isFinite(price)) continue;
            const date = new Date(ms).toISOString().slice(0, 10);
            if (date < PORTFOLIO_START_DATE || have.has(date)) continue;
            await upsertPriceSnapshot({
              assetId: asset.id,
              date,
              priceUsd: price,
              source: "api_coingecko",
            });
            have.add(date);
          }
        } else if (yahoo) {
          const data = (await fetchJson(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=1y`,
          )) as {
            chart?: {
              result?: Array<{
                timestamp?: number[];
                indicators?: {
                  quote?: Array<{ close?: Array<number | null> }>;
                };
              }>;
            };
          };
          const result = data.chart?.result?.[0];
          const stamps = result?.timestamp ?? [];
          const closes = result?.indicators?.quote?.[0]?.close ?? [];
          for (let i = 0; i < stamps.length; i++) {
            const close = closes[i];
            if (close == null || !Number.isFinite(close)) continue;
            const date = new Date(stamps[i] * 1000).toISOString().slice(0, 10);
            if (date < PORTFOLIO_START_DATE || have.has(date)) continue;
            await upsertPriceSnapshot({
              assetId: asset.id,
              date,
              priceUsd: Number(close),
              source: "api_yahoo",
            });
            have.add(date);
          }
        }
      } catch {
        /* live history is optional; trade prices still produce a line */
      }
    }),
  );
}

export async function getPortfolioHistory(current: {
  valueUsd: number;
  investedUsd: number;
}): Promise<NavHistoryPoint[]> {
  await fillHistoricalPrices();

  const catalog = await db
    .select()
    .from(assets)
    .where(isNull(assets.deletedAt));
  const financial = catalog.filter((a) => a.class !== "land");
  const byId = new Map(financial.map((a) => [a.id, a]));

  const txs = await db
    .select()
    .from(transactions)
    .where(isNull(transactions.deletedAt));
  txs.sort((a, b) => a.date.localeCompare(b.date));

  const payments = await db
    .select()
    .from(landPayments)
    .where(isNull(landPayments.deletedAt));
  payments.sort((a, b) => a.date.localeCompare(b.date));

  const prices = await db.select().from(priceSnapshots);
  const priceMap = new Map<string, Array<{ date: string; priceUsd: number }>>();
  for (const row of prices) {
    const list = priceMap.get(row.assetId) ?? [];
    list.push({ date: row.date, priceUsd: row.priceUsd });
    priceMap.set(row.assetId, list);
  }
  for (const tx of txs) {
    if (tx.quantity === 0) continue;
    const asset = byId.get(tx.assetId);
    if (!asset) continue;
    const priceUsd = tx.totalUsd / tx.quantity;
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) continue;
    const list = priceMap.get(tx.assetId) ?? [];
    list.push({ date: tx.date, priceUsd });
    priceMap.set(tx.assetId, list);
  }
  for (const [id, list] of priceMap) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    priceMap.set(id, list);
  }

  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.active, true));
  const bankSnaps = await db.select().from(bankBalanceSnapshots);
  bankSnaps.sort((a, b) => a.date.localeCompare(b.date));

  const loans = await db
    .select()
    .from(cryptoLoans)
    .where(
      and(eq(cryptoLoans.status, "ongoing"), isNull(cryptoLoans.deletedAt)),
    );

  const today = localISODate();
  const firstDates = [
    ...txs.map((t) => t.date),
    ...payments.map((p) => p.date),
    PORTFOLIO_START_DATE,
  ].filter((d) => d <= today);
  const start = firstDates.sort()[0] ?? PORTFOLIO_START_DATE;

  const qty = new Map<string, number>();
  const invested = new Map<string, number>();
  let txCursor = 0;
  let payCursor = 0;

  const points: NavHistoryPoint[] = [];

  for (const day of eachDay(start, today)) {
    while (txCursor < txs.length && txs[txCursor].date <= day) {
      const tx = txs[txCursor];
      if (byId.has(tx.assetId)) {
        const q = qty.get(tx.assetId) ?? 0;
        const inv = invested.get(tx.assetId) ?? 0;
        if (
          tx.type === "buy" ||
          tx.type === "transfer_in" ||
          tx.type === "reward"
        ) {
          qty.set(tx.assetId, q + tx.quantity);
          if (tx.type === "buy") invested.set(tx.assetId, inv + tx.totalUsd);
        } else if (tx.type === "sell" || tx.type === "transfer_out") {
          const cost = q > 0 ? inv / q : 0;
          qty.set(tx.assetId, q - tx.quantity);
          if (tx.type === "sell") {
            invested.set(tx.assetId, inv - cost * tx.quantity);
          }
        }
      }
      txCursor += 1;
    }
    while (payCursor < payments.length && payments[payCursor].date <= day) {
      payCursor += 1;
    }

    let financialValue = 0;
    let financialInvested = 0;
    for (const asset of financial) {
      const q = qty.get(asset.id) ?? 0;
      const inv = invested.get(asset.id) ?? 0;
      if (Math.abs(q) < 1e-12 && inv === 0) continue;
      financialInvested += inv;
      const listed = priceOnOrBefore(priceMap.get(asset.id) ?? [], day);
      const price =
        listed ??
        (STABLE.has(asset.ticker.toUpperCase()) || asset.class === "stable"
          ? 1
          : null);
      financialValue += price != null ? q * price : inv;
    }

    const landPaid = payments
      .slice(0, payCursor)
      .reduce((s, p) => s + p.amountUsd, 0);

    let cashUsd = 0;
    for (const account of accounts) {
      const latest = [...bankSnaps]
        .filter((s) => s.accountId === account.id && s.date <= day)
        .at(-1);
      if (latest && latest.balanceUsd > 0) cashUsd += latest.balanceUsd;
    }

    let debtUsd = 0;
    for (const loan of loans) {
      const ticker = loan.loanCoin.toUpperCase();
      if (STABLE.has(ticker)) {
        debtUsd += loan.totalDebt;
        continue;
      }
      const holding = financial.find((a) => a.ticker.toUpperCase() === ticker);
      const price = holding
        ? priceOnOrBefore(priceMap.get(holding.id) ?? [], day)
        : null;
      debtUsd += price != null ? loan.totalDebt * price : loan.totalDebt;
    }

    const gross = financialValue + landPaid + cashUsd;
    const valueUsd = gross - debtUsd;
    const investedUsd = financialInvested + landPaid + cashUsd;
    if (points.length === 0 && valueUsd <= 0) continue;
    points.push({ date: day, valueUsd, investedUsd });
  }

  if (points.length === 0) {
    return [
      {
        date: today,
        valueUsd: current.valueUsd,
        investedUsd: current.investedUsd,
      },
    ];
  }

  const last = points[points.length - 1];
  last.date = today;
  last.valueUsd = current.valueUsd;
  last.investedUsd = current.investedUsd;
  return points;
}
