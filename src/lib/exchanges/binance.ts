import { createHmac } from "node:crypto";
import type { Balance, ConnectionTest, ExchangeClient, Trade } from "./types";

const BASE = "https://api.binance.com";
const QUOTES = ["USDT", "USDC"] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
    const data = await this.signedGet("/api/v3/account");
    const raw = Array.isArray(data.balances) ? data.balances : [];
    return raw
      .map((row) => {
        const b = row as { asset: string; free: string; locked: string };
        return {
          asset: b.asset,
          free: b.free,
          locked: b.locked,
          total: String(Number(b.free) + Number(b.locked)),
        };
      })
      .filter((b: Balance) => Number(b.total) > 0);
  }

  async getTrades(symbols: string[]): Promise<Trade[]> {
    const out: Trade[] = [];
    for (const symbol of symbols) {
      try {
        const rows = await this.getAllTrades(symbol);
        out.push(...rows);
      } catch (err) {
        console.error("[binance myTrades]", symbol, err);
      }
    }
    return out;
  }

  private async getAllTrades(symbol: string): Promise<Trade[]> {
    const out: Trade[] = [];
    // Without fromId Binance returns the *most recent* fills. Start at 1 so
    // the ledger is the full Spot history, then walk forward by trade id.
    let fromId = "1";
    for (let page = 0; page < 50; page++) {
      const extra: Record<string, string> = {
        symbol,
        limit: "1000",
        fromId,
      };
      const rows = await this.signedGet("/api/v3/myTrades", extra);
      const list = Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
      if (list.length === 0) break;
      for (const t of list) {
        out.push({
          externalId: `${symbol}:${String(t.id)}`,
          timestamp: new Date(Number(t.time)),
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

  private async signedGet(
    path: string,
    extra: Record<string, string> = {},
  ): Promise<Record<string, unknown> & { balances?: unknown[] }> {
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
      headers: { "X-MBX-APIKEY": this.apiKey },
    });
    const json = (await res.json()) as Record<string, unknown> & {
      balances?: unknown[];
      msg?: string;
    };
    if (!res.ok) {
      throw new Error(String(json.msg ?? `Binance HTTP ${res.status}`));
    }
    return json;
  }
}
