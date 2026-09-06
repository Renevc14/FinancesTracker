import {
  assertTrade,
  type ImportPreview,
  type ImportRowError,
  type ParsedTrade,
} from "@/lib/imports/types";
import { isoDateFromUnknown, splitCsvLine, zipRow } from "@/lib/imports/csv";

/**
 * Binance Auto-Invest History CSV.
 * Typical: Date, Asset / Crypto, Amount, Price / Unit Price, Cost / Transaction Amount
 */
export function parseBinanceAutoInvestCsv(csv: string): ImportPreview {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const errors: ImportRowError[] = [];
  const parsed: ParsedTrade[] = [];

  if (lines.length < 2) {
    return {
      source: "binance_auto_invest_csv",
      totalRows: 0,
      parsed: [],
      duplicates: [],
      errors: [{ line: 0, message: "CSV Auto-Invest vacío" }],
    };
  }

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const hasAsset = header.some((h) => h.includes("asset") || h.includes("crypto") || h.includes("coin"));
  const hasAmount = header.some((h) => h.includes("amount") || h.includes("qty"));
  if (!hasAsset || !hasAmount) {
    return {
      source: "binance_auto_invest_csv",
      totalRows: lines.length - 1,
      parsed: [],
      duplicates: [],
      errors: [
        {
          line: 1,
          message:
            "Cabecera Auto-Invest incompleta. Se espera Date, Asset/Crypto, Amount, Price.",
        },
      ],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    try {
      const row = zipRow(header, splitCsvLine(lines[i]!));
      const symbol = (
        row.asset ??
        row.crypto ??
        row.coin ??
        row.coinname ??
        ""
      ).toUpperCase();
      const qty = Number.parseFloat(row.amount ?? row.qty ?? row.executed ?? "");
      const price = Number.parseFloat(
        row.price ?? row["unit price"] ?? row.unitprice ?? "0",
      );
      const date = isoDateFromUnknown(
        row.date ?? row.time ?? row["date(utc)"] ?? row.datetime ?? "",
      );
      const importRef =
        row.orderid ??
        row.id ??
        `ai|${date}|${symbol}|${qty}|${price}`;
      const trade: ParsedTrade = {
        importRef: String(importRef),
        source: "binance_auto_invest_csv",
        date,
        symbol,
        side: "buy",
        quantity: qty,
        unitPrice: Number.isFinite(price) ? price : 0,
        priceCurrency: "USD",
        fxRate: 1,
        platform: "Binance",
        notes: "Binance Auto-Invest",
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
    source: "binance_auto_invest_csv",
    totalRows: lines.length - 1,
    parsed,
    duplicates: [],
    errors,
  };
}
