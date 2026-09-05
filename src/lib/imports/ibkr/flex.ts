import type { ImportPreview, ImportRowError } from "@/lib/imports/types";

/** IBKR Flex Query trades — full mapping in Phase 2. */
export function parseIbkrFlexCsv(csv: string): ImportPreview {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const errors: ImportRowError[] = [];

  if (lines.length === 0) {
    return {
      source: "ibkr_flex_csv",
      totalRows: 0,
      parsed: [],
      duplicates: [],
      errors: [{ line: 0, message: "CSV IBKR vacío" }],
    };
  }

  const header = lines[0]!.toLowerCase();
  const looksLikeIbkr =
    header.includes("symbol") ||
    header.includes("tradecurrency") ||
    header.includes("iborderid") ||
    header.includes("trades");

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
            "No parece un Flex/Activity de IBKR. Exporta Trades desde Flex Query.",
        },
      ],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    errors.push({
      line: i + 1,
      message:
        "Parser IBKR Flex pendiente (Fase 2). Usa entrada manual por ahora.",
      raw: lines[i],
    });
  }

  return {
    source: "ibkr_flex_csv",
    totalRows: Math.max(0, lines.length - 1),
    parsed: [],
    duplicates: [],
    errors,
  };
}
