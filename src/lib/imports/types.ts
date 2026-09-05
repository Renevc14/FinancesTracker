/**
 * Broker/exchange import contracts.
 * Phase 2 wires full CSV/API parsers; Phase 0 defines the stable surface.
 */

export const IMPORT_SOURCES = [
  "manual",
  "binance_spot_csv",
  "binance_auto_invest_csv",
  "ibkr_flex_csv",
  "sheet_csv",
] as const;

export type ImportSource = (typeof IMPORT_SOURCES)[number];

export type ParsedTradeSide =
  | "buy"
  | "sell"
  | "transfer_in"
  | "transfer_out"
  | "reward";

/** Normalized trade ready for DB insert after asset resolution. */
export type ParsedTrade = {
  importRef: string;
  source: ImportSource;
  /** ISO date YYYY-MM-DD */
  date: string;
  symbol: string;
  side: ParsedTradeSide;
  quantity: number;
  unitPrice: number;
  priceCurrency: string;
  fxRate: number;
  platform: string;
  feeQuantity?: number;
  feeAsset?: string;
  notes?: string;
  raw?: Record<string, string>;
};

export type ImportRowError = {
  line: number;
  message: string;
  raw?: string;
};

export type ImportPreview = {
  source: ImportSource;
  totalRows: number;
  parsed: ParsedTrade[];
  duplicates: ParsedTrade[];
  errors: ImportRowError[];
};

export type ImportCommitResult = {
  inserted: number;
  skippedDuplicates: number;
  failed: number;
  errors: ImportRowError[];
};

export class ImportParseError extends Error {
  constructor(
    message: string,
    readonly line?: number,
  ) {
    super(message);
    this.name = "ImportParseError";
  }
}

export function isFinitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

export function assertTrade(trade: ParsedTrade, line: number): void {
  if (!trade.importRef?.trim()) {
    throw new ImportParseError("Falta importRef (idempotencia)", line);
  }
  if (!isIsoDate(trade.date)) {
    throw new ImportParseError(`Fecha inválida: ${trade.date}`, line);
  }
  if (!trade.symbol?.trim()) {
    throw new ImportParseError("Símbolo vacío", line);
  }
  if (!isFinitePositive(trade.quantity)) {
    throw new ImportParseError(`Cantidad inválida: ${trade.quantity}`, line);
  }
  if (
    !(
      typeof trade.unitPrice === "number" &&
      Number.isFinite(trade.unitPrice) &&
      trade.unitPrice >= 0
    )
  ) {
    throw new ImportParseError(`Precio inválido: ${trade.unitPrice}`, line);
  }
  if (
    !(
      typeof trade.fxRate === "number" &&
      Number.isFinite(trade.fxRate) &&
      trade.fxRate > 0
    )
  ) {
    throw new ImportParseError(`FX inválido: ${trade.fxRate}`, line);
  }
}
