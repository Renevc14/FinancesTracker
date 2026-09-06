import {
  assertTrade,
  type ImportPreview,
  type ImportRowError,
  type ParsedTrade,
} from "@/lib/imports/types";
import { isoDateFromUnknown, splitCsvLine, zipRow } from "@/lib/imports/csv";

/**
 * IBKR Flex / Activity trades CSV.
 * Typical: DateTime, Buy/Sell, Symbol, Quantity, TradePrice, CurrencyPrimary, IBOrderID
 */
export function parseIbkrFlexCsv(csv: string): ImportPreview {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const errors: ImportRowError[] = [];
  const parsed: ParsedTrade[] = [];

  if (lines.length === 0) {
    return {
      source: "ibkr_flex_csv",
      totalRows: 0,
      parsed: [],
      duplicates: [],
      errors: [{ line: 0, message: "CSV IBKR vacío" }],
    };
  }

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const looksLikeIbkr =
    header.includes("symbol") ||
    header.includes("tradecurrency") ||
    header.includes("iborderid") ||
    header.some((h) => h.includes("buy/sell") || h === "buysell");

  if (!looksLikeIbkr) {
    return {
      source: "ibkr_flex_csv",
      totalRows: Math.max(0, lines.length - 1),
      parsed: [],
      duplicates: [],
      errors: [
        {
          line: 1,
          message:
            "No parece un Flex/Activity de IBKR. Exporta Trades (Symbol, Buy/Sell, Quantity, TradePrice).",
        },
      ],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    try {
      const row = zipRow(header, splitCsvLine(lines[i]!));
      const sideRaw = (row["buy/sell"] ?? row.buysell ?? row.side ?? "").toUpperCase();
      const side =
        sideRaw.startsWith("BUY") || sideRaw === "BOT"
          ? "buy"
          : sideRaw.startsWith("SELL") || sideRaw === "SLD"
            ? "sell"
            : null;
      if (!side) {
        errors.push({
          line: lineNo,
          message: `Side no soportado: ${sideRaw}`,
          raw: lines[i],
        });
        continue;
      }
      const symbol = (row.symbol ?? "").toUpperCase().replace(/\.USD$|\.EUR$/i, "");
      const qty = Math.abs(Number.parseFloat(row.quantity ?? row.qty ?? ""));
      const price = Number.parseFloat(row.tradeprice ?? row.price ?? row.priceperunit ?? "");
      const date = isoDateFromUnknown(
        row.datetime ?? row.tradedate ?? row.date ?? row.reportdate ?? "",
      );
      const currency = (row.currencyprimary ?? row.currency ?? "USD").toUpperCase();
      const importRef =
        row.iborderid ??
        row.tradeid ??
        row.transactionid ??
        `ibkr|${date}|${symbol}|${side}|${qty}|${price}`;
      const trade: ParsedTrade = {
        importRef: String(importRef),
        source: "ibkr_flex_csv",
        date,
        symbol,
        side,
        quantity: qty,
        unitPrice: price,
        priceCurrency: currency === "USD" ? "USD" : currency,
        fxRate: 1,
        platform: "IBKR",
        notes: "IBKR Flex",
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
    source: "ibkr_flex_csv",
    totalRows: Math.max(0, lines.length - 1),
    parsed,
    duplicates: [],
    errors,
  };
}
