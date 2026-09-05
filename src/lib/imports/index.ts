import { parseBinanceAutoInvestCsv } from "@/lib/imports/binance/auto-invest";
import { parseBinanceSpotCsv } from "@/lib/imports/binance/spot";
import { partitionDuplicates } from "@/lib/imports/dedupe";
import { parseIbkrFlexCsv } from "@/lib/imports/ibkr/flex";
import type { ImportPreview, ImportSource } from "@/lib/imports/types";

export type SupportedImportSource = Extract<
  ImportSource,
  "binance_spot_csv" | "binance_auto_invest_csv" | "ibkr_flex_csv"
>;

const PARSERS: Record<SupportedImportSource, (csv: string) => ImportPreview> = {
  binance_spot_csv: parseBinanceSpotCsv,
  binance_auto_invest_csv: parseBinanceAutoInvestCsv,
  ibkr_flex_csv: parseIbkrFlexCsv,
};

export function listImportSources(): {
  id: SupportedImportSource;
  label: string;
  ready: boolean;
}[] {
  return [
    { id: "binance_spot_csv", label: "Binance Spot Trade History", ready: true },
    {
      id: "binance_auto_invest_csv",
      label: "Binance Auto-Invest",
      ready: false,
    },
    { id: "ibkr_flex_csv", label: "IBKR Flex Query (Trades)", ready: false },
  ];
}

/** Parse + dedupe preview. Never writes to DB. */
export async function previewImport(
  source: SupportedImportSource,
  csv: string,
): Promise<ImportPreview> {
  if (!csv || csv.trim().length === 0) {
    return {
      source,
      totalRows: 0,
      parsed: [],
      duplicates: [],
      errors: [{ line: 0, message: "Archivo vacío" }],
    };
  }

  const MAX_CHARS = 2_000_000;
  if (csv.length > MAX_CHARS) {
    return {
      source,
      totalRows: 0,
      parsed: [],
      duplicates: [],
      errors: [
        {
          line: 0,
          message: `CSV demasiado grande (>${MAX_CHARS} chars). Divide el export.`,
        },
      ],
    };
  }

  const preview = PARSERS[source](csv);
  const { fresh, duplicates } = await partitionDuplicates(
    source,
    preview.parsed,
  );

  return {
    ...preview,
    parsed: fresh,
    duplicates: [...preview.duplicates, ...duplicates],
  };
}

export {
  parseBinanceSpotCsv,
  parseBinanceAutoInvestCsv,
  parseIbkrFlexCsv,
  partitionDuplicates,
};
