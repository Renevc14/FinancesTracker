import type { ImportPreview, ImportRowError } from "@/lib/imports/types";

/** Binance Auto-Invest History — full mapping in Phase 2. */
export function parseBinanceAutoInvestCsv(csv: string): ImportPreview {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const errors: ImportRowError[] = [];

  if (lines.length < 2) {
    return {
      source: "binance_auto_invest_csv",
      totalRows: 0,
      parsed: [],
      duplicates: [],
      errors: [{ line: 0, message: "CSV Auto-Invest vacío" }],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    errors.push({
      line: i + 1,
      message:
        "Parser Auto-Invest pendiente (Fase 2). Usa Spot CSV o entrada manual.",
      raw: lines[i],
    });
  }

  return {
    source: "binance_auto_invest_csv",
    totalRows: Math.max(0, lines.length - 1),
    parsed: [],
    duplicates: [],
    errors,
  };
}
