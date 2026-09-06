import { createHmac } from "node:crypto";
import type { Balance, ConnectionTest, ExchangeClient } from "./types";

const BASE = "https://api.binance.com";

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
    const balances = Array.isArray(data.balances) ? data.balances : [];
    return balances
      .map((b: { asset: string; free: string; locked: string }) => ({
        asset: b.asset,
        free: b.free,
        locked: b.locked,
        total: String(Number(b.free) + Number(b.locked)),
      }))
      .filter((b: Balance) => Number(b.total) > 0);
  }

  private async signedGet(path: string): Promise<{ balances?: unknown[] }> {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}&recvWindow=5000`;
    const signature = createHmac("sha256", this.apiSecret).update(query).digest("hex");
    const res = await fetch(`${BASE}${path}?${query}&signature=${signature}`, {
      headers: { "X-MBX-APIKEY": this.apiKey },
    });
    const json = (await res.json()) as { balances?: unknown[]; msg?: string; code?: number };
    if (!res.ok) {
      throw new Error(json.msg ?? `Binance HTTP ${res.status}`);
    }
    return json;
  }
}
