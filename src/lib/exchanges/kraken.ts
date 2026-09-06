import { createHmac } from "node:crypto";
import type { Balance, ConnectionTest, ExchangeClient } from "./types";

const BASE = "https://api.kraken.com";

export class KrakenClient implements ExchangeClient {
  readonly providerName = "kraken";

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  async testConnection(): Promise<ConnectionTest> {
    try {
      await this.getBalances();
      return { ok: true, scopes: ["read"] };
    } catch (err) {
      return {
        ok: false,
        scopes: [],
        error: err instanceof Error ? err.message : "Fallo Kraken",
      };
    }
  }

  async getBalances(): Promise<Balance[]> {
    const data = await this.signedPost("/0/private/Balance");
    const result = (data.result ?? {}) as Record<string, string>;
    return Object.entries(result)
      .map(([asset, total]) => ({
        asset: asset.replace(/^X/, "").replace(/^Z/, ""),
        free: String(total),
        locked: "0",
        total: String(total),
      }))
      .filter((b) => Number(b.total) > 0);
  }

  private async signedPost(path: string): Promise<{ result?: Record<string, string>; error?: string[] }> {
    const nonce = String(Date.now() * 1000);
    const body = new URLSearchParams({ nonce });
    const sha = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(nonce + body.toString()),
    );
    const secret = Buffer.from(this.apiSecret, "base64");
    const hmac = createHmac("sha512", secret);
    hmac.update(path);
    hmac.update(Buffer.from(sha));
    const signature = hmac.digest("base64");
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "API-Key": this.apiKey,
        "API-Sign": signature,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = (await res.json()) as {
      result?: Record<string, string>;
      error?: string[];
    };
    if (!res.ok || (json.error && json.error.length > 0)) {
      throw new Error(json.error?.join(", ") ?? `Kraken HTTP ${res.status}`);
    }
    return json;
  }
}
