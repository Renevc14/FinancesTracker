import type { Balance, ConnectionTest, ExchangeClient } from "./types";

const SEND =
  "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest";
const GET =
  "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/GetStatement";

export class IbkrFlexClient implements ExchangeClient {
  readonly providerName = "ibkr_flex";

  constructor(
    private readonly token: string,
    private readonly queryId: string,
  ) {}

  async testConnection(): Promise<ConnectionTest> {
    if (!this.token || !this.queryId) {
      return { ok: false, scopes: [], error: "Falta token o Flex Query ID" };
    }
    try {
      await this.sendRequest();
      return { ok: true, scopes: ["flex"] };
    } catch (err) {
      return {
        ok: false,
        scopes: [],
        error: err instanceof Error ? err.message : "Fallo IBKR Flex",
      };
    }
  }

  async getBalances(): Promise<Balance[]> {
    const xml = await this.fetchStatement();
    const out: Balance[] = [];
    const re =
      /<OpenPosition[^>]*symbol="([^"]+)"[^>]*position="([^"]+)"[^>]*/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(xml))) {
      const qty = Number(match[2]);
      if (!Number.isFinite(qty) || qty === 0) continue;
      out.push({
        asset: match[1]!,
        free: String(qty),
        locked: "0",
        total: String(qty),
      });
    }
    return out;
  }

  async fetchStatement(): Promise<string> {
    const ref = await this.sendRequest();
    await new Promise((r) => setTimeout(r, 1500));
    const url = `${GET}?t=${encodeURIComponent(this.token)}&q=${encodeURIComponent(ref)}&v=3`;
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok || text.includes("Error")) {
      throw new Error(text.slice(0, 180) || `IBKR GetStatement HTTP ${res.status}`);
    }
    return text;
  }

  private async sendRequest(): Promise<string> {
    const url = `${SEND}?t=${encodeURIComponent(this.token)}&q=${encodeURIComponent(this.queryId)}&v=3`;
    const res = await fetch(url);
    const text = await res.text();
    const ref = text.match(/<ReferenceCode>([^<]+)<\/ReferenceCode>/)?.[1];
    if (!ref) {
      throw new Error(text.slice(0, 180) || "IBKR SendRequest sin ReferenceCode");
    }
    return ref;
  }
}
