import { createHmac } from "node:crypto";
import type { Balance, ConnectionTest, ExchangeClient, Trade } from "./types";

const BASE = "https://api.binance.com";

const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
];

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
        error: balances.length === 0 ? "Sin balances (cuenta vacía o solo lectura OK)" : undefined,
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

  async getTrades(symbols = DEFAULT_SYMBOLS): Promise<Trade[]> {
    const out: Trade[] = [];
    for (const symbol of symbols) {
      try {
        const rows = await this.signedGet("/api/v3/myTrades", { symbol, limit: "100" });
        const list = Array.isArray(rows) ? rows : [];
        for (const t of list as Array<Record<string, unknown>>) {
          out.push({
            externalId: String(t.id),
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
      } catch {
        /* symbol without trades or missing permission */
      }
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
      recvWindow: "5000",
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
