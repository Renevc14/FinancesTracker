import { isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { localISODate } from "@/lib/utils";
import { upsertFxRate, upsertPriceSnapshot } from "@/lib/services/snapshot";

const GECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDC: "usd-coin",
  USDT: "tether",
};

const YAHOO_SYMBOLS: Record<string, string> = {
  VUAA: "VUAA.L",
};

export type MarketRefreshResult = {
  prices: number;
  fx: number;
  errors: string[];
};

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function refreshCrypto(today: string): Promise<{ n: number; errors: string[] }> {
  const catalog = await db.select().from(assets).where(isNull(assets.deletedAt));
  const ids = [
    ...new Set(
      catalog
        .filter((a) => GECKO_IDS[a.ticker])
        .map((a) => GECKO_IDS[a.ticker]!),
    ),
  ];
  if (ids.length === 0) return { n: 0, errors: [] };
  const errors: string[] = [];
  let n = 0;
  try {
    const data = (await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
    )) as Record<string, { usd?: number }>;
    for (const asset of catalog) {
      const gecko = GECKO_IDS[asset.ticker];
      const price = gecko ? data[gecko]?.usd : undefined;
      if (price == null || !Number.isFinite(price)) continue;
      await upsertPriceSnapshot({
        assetId: asset.id,
        date: today,
        priceUsd: price,
        source: "api_coingecko",
      });
      n += 1;
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "CoinGecko falló");
  }
  return { n, errors };
}

async function refreshStocks(today: string): Promise<{ n: number; errors: string[] }> {
  const catalog = await db.select().from(assets).where(isNull(assets.deletedAt));
  const errors: string[] = [];
  let n = 0;
  for (const asset of catalog) {
    const symbol = YAHOO_SYMBOLS[asset.ticker];
    if (!symbol) continue;
    try {
      const data = (await fetchJson(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      )) as {
        chart?: {
          result?: Array<{
            meta?: { regularMarketPrice?: number };
            indicators?: { quote?: Array<{ close?: Array<number | null> }> };
          }>;
        };
      };
      const result = data.chart?.result?.[0];
      const closes = result?.indicators?.quote?.[0]?.close ?? [];
      const lastClose = [...closes].reverse().find((c) => c != null && Number.isFinite(c));
      const price = lastClose ?? result?.meta?.regularMarketPrice;
      if (price == null || !Number.isFinite(price)) {
        errors.push(`Yahoo ${symbol}: sin precio`);
        continue;
      }
      await upsertPriceSnapshot({
        assetId: asset.id,
        date: today,
        priceUsd: Number(price),
        source: "api_yahoo",
      });
      n += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Yahoo ${symbol} falló`);
    }
  }
  return { n, errors };
}

async function refreshFx(today: string): Promise<{ n: number; errors: string[] }> {
  const errors: string[] = [];
  let n = 0;
  try {
    const data = (await fetchJson("https://open.er-api.com/v6/latest/USD")) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const eur = data.rates?.EUR;
    if (data.result === "success" && eur && Number.isFinite(eur)) {
      await upsertFxRate({
        date: today,
        fromCurrency: "USD",
        toCurrency: "EUR",
        rate: eur,
        source: "api_exchangerate",
      });
      n += 1;
    } else {
      errors.push("FX USD/EUR no disponible");
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "FX API falló");
  }
  return { n, errors };
}

export async function refreshLiveMarkets(): Promise<MarketRefreshResult> {
  const today = localISODate();
  const crypto = await refreshCrypto(today);
  const stocks = await refreshStocks(today);
  const fx = await refreshFx(today);
  return {
    prices: crypto.n + stocks.n,
    fx: fx.n,
    errors: [...crypto.errors, ...stocks.errors, ...fx.errors],
  };
}

export function daysUntil(dateIso: string): number {
  const due = new Date(dateIso + "T12:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}
