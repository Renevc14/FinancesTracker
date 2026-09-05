import {
  assertTrade,
  type ImportPreview,
  type ImportRowError,
  type ParsedTrade,
} from "@/lib/imports/types";

/**
 * Binance Spot Trade History CSV.
 * Typical columns: Date(UTC), Pair, Side, Price, Executed, Amount, Fee
 */
const HEADER_HINTS = ["pair", "side", "price", "executed"];

export function parseBinanceSpotCsv(csv: string): ImportPreview {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const errors: ImportRowError[] = [];
  const parsed: ParsedTrade[] = [];

  if (lines.length < 2) {
    return {
      source: "binance_spot_csv",
      totalRows: 0,
      parsed: [],
      duplicates: [],
      errors: [{ line: 0, message: "CSV vacío o sin datos" }],
    };
  }

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const missing = HEADER_HINTS.filter(
    (h) => !header.some((c) => c.includes(h)),
  );
  if (missing.length > 0) {
    return {
      source: "binance_spot_csv",
      totalRows: lines.length - 1,
      parsed: [],
      duplicates: [],
      errors: [
        {
          line: 1,
          message: `Cabecera Binance Spot incompleta. Faltan: ${missing.join(", ")}`,
        },
      ],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const cols = splitCsvLine(lines[i]!);
    try {
      const row = zipRow(header, cols);
      const pair = (row.pair ?? row.symbol ?? "").toUpperCase();
      const sideRaw = (row.side ?? "").toUpperCase();
      const side =
        sideRaw === "BUY" ? "buy" : sideRaw === "SELL" ? "sell" : null;
      if (!side) {
        errors.push({
          line: lineNo,
          message: `Side no soportado: ${sideRaw}`,
          raw: lines[i],
        });
        continue;
      }

      const price = Number.parseFloat(row.price ?? "");
      const executed = parseAmountWithUnit(row.executed ?? "");
      const date = normalizeBinanceDate(
        row["date(utc)"] ?? row.date ?? row.time ?? "",
      );
      const importRef =
        row.orderid ??
        row.tradeid ??
        `${date}|${pair}|${side}|${row.executed}|${row.price}`;

      const baseSymbol =
        pair.replace(/(USDT|USDC|BUSD|USD|BTC|ETH)$/i, "") || pair;

      const trade: ParsedTrade = {
        importRef: String(importRef),
        source: "binance_spot_csv",
        date,
        symbol: baseSymbol,
        side,
        quantity: executed.qty,
        unitPrice: price,
        priceCurrency: "USD",
        fxRate: 1,
        platform: "Binance",
        notes: `Binance Spot ${pair}`,
        raw: row,
      };
      assertTrade(trade, lineNo);
      parsed.push(trade);
    } catch (err) {
      errors.push({
        line: lineNo,
        message: err instanceof Error ? err.message : "Fila inválida",
        raw: lines[i],
      });
    }
  }

  return {
    source: "binance_spot_csv",
    totalRows: lines.length - 1,
    parsed,
    duplicates: [],
    errors,
  };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function zipRow(header: string[], cols: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (let i = 0; i < header.length; i++) {
    row[header[i]!] = cols[i] ?? "";
  }
  return row;
}

function parseAmountWithUnit(value: string): { qty: number } {
  const m = value.match(/^([\d.]+)\s*([A-Za-z]+)?$/);
  if (!m) return { qty: Number.parseFloat(value) || 0 };
  return { qty: Number.parseFloat(m[1]!) };
}

function normalizeBinanceDate(value: string): string {
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const t = Date.parse(value);
  if (Number.isNaN(t)) throw new Error(`Fecha Binance inválida: ${value}`);
  return new Date(t).toISOString().slice(0, 10);
}
