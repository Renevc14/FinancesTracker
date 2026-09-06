import { createHmac } from "node:crypto";
import type {
  Balance,
  ConnectionTest,
  CustodySnapshot,
  ExchangeClient,
  LoanPosition,
  RewardEvent,
  Trade,
  WalletBreakdown,
} from "./types";

const BASE = "https://api.binance.com";
const QUOTES = ["USDT", "USDC"] as const;
const STABLE = new Set(["USDT", "USDC", "BUSD", "FDUSD", "USD"]);

/** This tracker starts here (America/La_Paz). Older Spot fills are ignored. */
export const PORTFOLIO_START_DATE = "2026-02-01";

export function portfolioStartMs(date = PORTFOLIO_START_DATE) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asRows(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object") {
    const rows = (data as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>;
  }
  return [];
}

function binanceError(data: unknown, httpStatus: number): string | null {
  if (data && typeof data === "object") {
    const rec = data as { code?: unknown; msg?: unknown };
    const code = Number(rec.code);
    if (Number.isFinite(code) && code < 0) {
      return String(rec.msg ?? `Binance code ${code}`);
    }
  }
  if (httpStatus >= 400) {
    if (data && typeof data === "object" && "msg" in data) {
      return String((data as { msg?: unknown }).msg ?? `Binance HTTP ${httpStatus}`);
    }
    return `Binance HTTP ${httpStatus}`;
  }
  return null;
}

export function binanceSpotSymbolsFor(tickers: string[]): string[] {
  const symbols: string[] = [];
  for (const ticker of tickers) {
    const t = ticker.toUpperCase();
    if (QUOTES.includes(t as (typeof QUOTES)[number])) continue;
    for (const quote of QUOTES) {
      symbols.push(`${t}${quote}`);
    }
  }
  return [...new Set(symbols)];
}

export function isStableCoin(ticker: string): boolean {
  return STABLE.has(ticker.toUpperCase());
}

export class BinanceClient implements ExchangeClient {
  readonly providerName = "binance";

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  async testConnection(): Promise<ConnectionTest> {
    try {
      const balances = await this.getBalances();
      return {
        ok: true,
        scopes: ["read"],
        error:
          balances.length === 0
            ? "Sin balances (cuenta vacía o solo lectura OK)"
            : undefined,
      };
    } catch (err) {
      return {
        ok: false,
        scopes: [],
        error: err instanceof Error ? err.message : "Fallo Binance",
      };
    }
  }

  async getBalances(): Promise<Balance[]> {
    const data = await this.signedRequest("GET", "/api/v3/account");
    const raw =
      data && typeof data === "object"
        ? (data as { balances?: unknown[] }).balances
        : undefined;
    const list = Array.isArray(raw) ? raw : [];
    return rawToBalances(list);
  }

  async getTrades(symbols: string[]): Promise<Trade[]> {
    const sinceMs = portfolioStartMs();
    const out: Trade[] = [];
    for (const symbol of symbols) {
      try {
        const rows = await this.getAllTrades(symbol, sinceMs);
        out.push(...rows);
      } catch (err) {
        console.error("[binance myTrades]", symbol, err);
      }
    }
    return out;
  }

  async getCustodySnapshot(spot: Balance[]): Promise<CustodySnapshot> {
    const warnings: string[] = [];
    const earn = await this.safeCall("Earn", () => this.getEarnBalances(), warnings);
    const funding = await this.safeCall(
      "Funding",
      () => this.getFundingBalances(),
      warnings,
    );
    const loans = await this.safeCall("Loan", () => this.getLoans(), warnings);
    const rewards = await this.safeCall(
      "Earn rewards",
      () => this.getEarnRewards(portfolioStartMs()),
      warnings,
    );

    const earnOk = !warnings.some((w) => w.startsWith("Earn:"));
    const wallets = mergeWallets({
      spot,
      earn: earn ?? [],
      funding: funding ?? [],
      loans: loans ?? [],
      mapLockedDeposit: !earnOk,
    });

    return {
      wallets,
      loans: loans ?? [],
      rewards: rewards ?? [],
      warnings,
    };
  }

  private async getEarnBalances(): Promise<Balance[]> {
    const out: Balance[] = [];
    for (const path of [
      "/sapi/v1/simple-earn/flexible/position",
      "/sapi/v1/simple-earn/locked/position",
    ]) {
      await sleep(200);
      const data = await this.signedRequest("GET", path, {
        current: "1",
        size: "100",
      });
      for (const row of asRows(data)) {
        const asset = String(row.asset ?? "").toUpperCase();
        const amount = num(row.totalAmount ?? row.amount);
        if (!asset || amount <= 0) continue;
        out.push({
          asset,
          free: String(amount),
          locked: "0",
          total: String(amount),
        });
      }
    }
    return out;
  }

  private async getFundingBalances(): Promise<Balance[]> {
    await sleep(200);
    const data = await this.signedRequest("POST", "/sapi/v1/asset/get-funding-asset");
    return rawToBalances(Array.isArray(data) ? data : asRows(data));
  }

  private async getLoans(): Promise<LoanPosition[]> {
    const out: LoanPosition[] = [];
    await sleep(200);
    const flex = await this.signedRequest("GET", "/sapi/v2/loan/flexible/ongoing/orders", {
      current: "1",
      limit: "100",
    });
    out.push(...parseLoans(asRows(flex), "flexible"));
    await sleep(200);
    try {
      const stable = await this.signedRequest("GET", "/sapi/v1/loan/ongoing/orders", {
        current: "1",
        limit: "100",
      });
      out.push(...parseLoans(asRows(stable), "stable"));
    } catch {
      // Stable-rate loan API is deprecated on many accounts.
    }
    return out;
  }

  private async getEarnRewards(sinceMs: number): Promise<RewardEvent[]> {
    const out: RewardEvent[] = [];
    const now = Date.now();
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    const paths = [
      "/sapi/v1/simple-earn/flexible/history/rewardsRecord",
      "/sapi/v1/simple-earn/locked/history/rewardsRecord",
    ];
    const types = ["BONUS", "REALTIME", "REWARDS"];
    for (const path of paths) {
      const kind = path.includes("locked") ? "locked" : "flex";
      for (const rewardType of types) {
        for (let start = sinceMs; start < now; start += windowMs) {
          const end = Math.min(start + windowMs - 1, now);
          for (let page = 1; page <= 20; page++) {
            await sleep(200);
            let data: unknown;
            try {
              data = await this.signedRequest("GET", path, {
                type: rewardType,
                startTime: String(start),
                endTime: String(end),
                current: String(page),
                size: "100",
              });
            } catch (err) {
              console.error("[binance Earn rewards]", kind, rewardType, err);
              break;
            }
            const rows = asRows(data);
            if (rows.length === 0) break;
            for (const row of rows) {
              const time = num(row.time);
              const amount = String(row.rewards ?? row.amount ?? "0");
              const asset = String(row.asset ?? "").toUpperCase();
              if (!asset || num(amount) === 0 || time < sinceMs) continue;
              out.push({
                externalId: `${kind}:${asset}:${time}:${amount}:${String(row.type ?? rewardType)}`,
                timestamp: new Date(time),
                asset,
                amount,
                source: "simple_earn",
              });
            }
            if (rows.length < 100) break;
          }
        }
      }
    }
    return out;
  }

  private async getAllTrades(
    symbol: string,
    sinceMs: number,
  ): Promise<Trade[]> {
    const out: Trade[] = [];
    let fromId = "1";
    for (let page = 0; page < 50; page++) {
      const extra: Record<string, string> = {
        symbol,
        limit: "1000",
        fromId,
      };
      const rows = await this.signedRequest("GET", "/api/v3/myTrades", extra);
      const list = Array.isArray(rows)
        ? (rows as Array<Record<string, unknown>>)
        : [];
      if (list.length === 0) break;
      for (const t of list) {
        const time = Number(t.time);
        if (!Number.isFinite(time) || time < sinceMs) continue;
        out.push({
          externalId: `${symbol}:${String(t.id)}`,
          timestamp: new Date(time),
          symbol,
          side: t.isBuyer ? "buy" : "sell",
          quantity: String(t.qty ?? "0"),
          price: String(t.price ?? "0"),
          quoteQuantity: String(t.quoteQty ?? "0"),
          fee: String(t.commission ?? "0"),
          feeAsset: String(t.commissionAsset ?? ""),
        });
      }
      if (list.length < 1000) break;
      const lastId = Number(list[list.length - 1]?.id);
      if (!Number.isFinite(lastId)) break;
      fromId = String(lastId + 1);
      await sleep(250);
    }
    return out;
  }

  private async safeCall<T>(
    label: string,
    fn: () => Promise<T>,
    warnings: string[],
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      warnings.push(`${label}: ${message}`);
      console.error(`[binance ${label}]`, err);
      return null;
    }
  }

  private async signedRequest(
    method: "GET" | "POST",
    path: string,
    extra: Record<string, string> = {},
  ): Promise<unknown> {
    const timestamp = Date.now();
    const params = new URLSearchParams({
      timestamp: String(timestamp),
      recvWindow: "10000",
      ...extra,
    });
    const signature = createHmac("sha256", this.apiSecret)
      .update(params.toString())
      .digest("hex");
    params.set("signature", signature);
    const res = await fetch(`${BASE}${path}?${params.toString()}`, {
      method,
      headers: { "X-MBX-APIKEY": this.apiKey },
    });
    const json: unknown = await res.json();
    const err = binanceError(json, res.status);
    if (err) throw new Error(err);
    return json;
  }
}

function rawToBalances(list: unknown[]): Balance[] {
  return list
    .map((row) => {
      const b = row as {
        asset?: string;
        free?: string;
        locked?: string;
        freeze?: string;
        withdrawing?: string;
      };
      const free = num(b.free);
      const locked = num(b.locked) + num(b.freeze) + num(b.withdrawing);
      return {
        asset: String(b.asset ?? ""),
        free: String(free),
        locked: String(locked),
        total: String(free + locked),
      };
    })
    .filter((b) => b.asset && Number(b.total) > 0);
}

function parseLoans(
  rows: Array<Record<string, unknown>>,
  product: LoanPosition["product"],
): LoanPosition[] {
  const out: LoanPosition[] = [];
  for (const row of rows) {
    const loanCoin = String(row.loanCoin ?? "").toUpperCase();
    const collateralCoin = String(row.collateralCoin ?? "").toUpperCase();
    const totalDebt = num(row.totalDebt ?? row.outstanding);
    const collateralAmount = num(row.collateralAmount);
    if (!loanCoin || !collateralCoin || (totalDebt <= 0 && collateralAmount <= 0)) {
      continue;
    }
    const orderId = row.orderId ?? row.loanId;
    const externalRef = orderId
      ? `${product}:${String(orderId)}`
      : `${product}:${loanCoin}:${collateralCoin}`;
    out.push({
      externalRef,
      product,
      loanCoin,
      totalDebt,
      collateralCoin,
      collateralAmount,
      currentLtv: num(row.currentLTV ?? row.currentLtv) || null,
    });
  }
  return out;
}

function mergeWallets(input: {
  spot: Balance[];
  earn: Balance[];
  funding: Balance[];
  loans: LoanPosition[];
  mapLockedDeposit: boolean;
}): WalletBreakdown[] {
  const map = new Map<
    string,
    { spot: number; earn: number; funding: number; collateral: number }
  >();

  const bump = (
    asset: string,
    bucket: "spot" | "earn" | "funding" | "collateral",
    amount: number,
  ) => {
    const key = asset.toUpperCase();
    if (!key || amount === 0) return;
    const cur = map.get(key) ?? { spot: 0, earn: 0, funding: 0, collateral: 0 };
    cur[bucket] += amount;
    map.set(key, cur);
  };

  for (const b of input.spot) {
    const raw = b.asset.toUpperCase();
    if (raw.startsWith("LD") && raw.length > 3) {
      if (input.mapLockedDeposit) bump(raw.slice(2), "earn", Number(b.total));
      continue;
    }
    bump(raw, "spot", Number(b.total));
  }
  for (const b of input.earn) bump(b.asset, "earn", Number(b.total));
  for (const b of input.funding) bump(b.asset, "funding", Number(b.total));
  for (const loan of input.loans) {
    bump(loan.collateralCoin, "collateral", loan.collateralAmount);
  }

  return [...map.entries()]
    .map(([asset, v]) => ({
      asset,
      ...v,
      total: v.spot + v.earn + v.funding + v.collateral,
    }))
    .filter((w) => w.total > 0)
    .sort((a, b) => b.total - a.total);
}
