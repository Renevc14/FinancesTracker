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
    const rec = data as { rows?: unknown; list?: unknown };
    if (Array.isArray(rec.rows)) return rec.rows as Array<Record<string, unknown>>;
    if (Array.isArray(rec.list)) return rec.list as Array<Record<string, unknown>>;
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
            ? "No balances (empty or read-only OK)"
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
      () => this.getEarnRewards(portfolioStartMs(), warnings),
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

  private async getEarnRewards(
    sinceMs: number,
    warnings: string[],
  ): Promise<RewardEvent[]> {
    const out: RewardEvent[] = [];
    const types = ["BONUS", "REALTIME", "REWARDS"];
    const flexPath = "/sapi/v1/simple-earn/flexible/history/rewardsRecord";
    const lockedPath = "/sapi/v1/simple-earn/locked/history/rewardsRecord";

    for (const rewardType of types) {
      await this.paginateSigned(
        flexPath,
        { type: rewardType },
        sinceMs,
        30,
        (row) => pushReward(out, row, `flex:${rewardType}`, sinceMs),
        warnings,
      );
    }
    await this.paginateSigned(
      lockedPath,
      {},
      sinceMs,
      30,
      (row) => pushReward(out, row, "locked", sinceMs),
      warnings,
    );

    if (out.length === 0) {
      await this.paginateSigned(
        "/sapi/v1/asset/assetDividend",
        { limit: "500" },
        sinceMs,
        90,
        (row) => pushReward(out, row, "div", sinceMs),
        warnings,
        { pageParam: null, sizeParam: null },
      );
    }

    return dedupeRewards(out);
  }

  private async paginateSigned(
    path: string,
    extra: Record<string, string>,
    sinceMs: number,
    windowDays: number,
    onRow: (row: Record<string, unknown>) => void,
    warnings: string[],
    opts?: { pageParam: string | null; sizeParam: string | null },
  ): Promise<void> {
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const pageParam = opts?.pageParam === undefined ? "current" : opts.pageParam;
    const sizeParam = opts?.sizeParam === undefined ? "size" : opts.sizeParam;
    for (let start = sinceMs; start < now; start += windowMs) {
      const end = Math.min(start + windowMs - 1, now);
      for (let page = 1; page <= 20; page++) {
        await sleep(200);
        const query: Record<string, string> = {
          ...extra,
          startTime: String(start),
          endTime: String(end),
        };
        if (pageParam) query[pageParam] = String(page);
        if (sizeParam) query[sizeParam] = "100";
        try {
          const data = await this.signedRequest("GET", path, query);
          const rows = asRows(data);
          if (rows.length === 0) break;
          for (const row of rows) onRow(row);
          if (rows.length < 100 || !pageParam) break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          warnings.push(`Earn ${path}: ${message}`);
          console.error("[binance Earn rewards]", path, extra, err);
          return;
        }
      }
    }
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
    const timestamp = Date.now() - 3000;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extra)) {
      if (value !== "") params.set(key, value);
    }
    params.set("recvWindow", "60000");
    params.set("timestamp", String(timestamp));
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

function pushReward(
  out: RewardEvent[],
  row: Record<string, unknown>,
  kind: string,
  sinceMs: number,
) {
  const time = num(row.time ?? row.divTime);
  const amount = String(row.rewards ?? row.amount ?? "0");
  const asset = String(row.asset ?? "").toUpperCase();
  if (!asset || num(amount) === 0 || time < sinceMs) return;
  const id = row.tranId ?? row.id ?? `${time}:${amount}:${kind}`;
  out.push({
    externalId: `${kind}:${asset}:${String(id)}`,
    timestamp: new Date(time),
    asset,
    amount,
    source: "simple_earn",
  });
}

function dedupeRewards(rows: RewardEvent[]): RewardEvent[] {
  const seen = new Set<string>();
  const out: RewardEvent[] = [];
  for (const row of rows) {
    if (seen.has(row.externalId)) continue;
    seen.add(row.externalId);
    out.push(row);
  }
  return out;
}
