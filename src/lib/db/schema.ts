import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const assetClasses = [
  "crypto",
  "stock",
  "stable",
  "land",
  "cash",
] as const;
export type AssetClass = (typeof assetClasses)[number];

export const transactionTypes = [
  "buy",
  "sell",
  "transfer_in",
  "transfer_out",
  "reward",
] as const;
export type TransactionType = (typeof transactionTypes)[number];

export const landConcepts = [
  "reservation",
  "initial",
  "installment",
  "balloon",
  "tax",
  "notary",
  "other",
] as const;
export type LandConcept = (typeof landConcepts)[number];

export const landStatuses = [
  "reserved",
  "signed",
  "paying",
  "delivered",
  "cancelled",
] as const;
export type LandStatus = (typeof landStatuses)[number];

export const priceSources = [
  "manual",
  "api_coingecko",
  "api_yahoo",
  "api_bcb",
] as const;
export type PriceSource = (typeof priceSources)[number];

export const fxSources = [
  "manual",
  "api_exchangerate",
  "paralelo_manual",
] as const;
export type FxSource = (typeof fxSources)[number];

export const displayCurrencies = ["USD", "EUR", "BOB"] as const;
export type DisplayCurrency = (typeof displayCurrencies)[number];

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
};

export const assets = sqliteTable(
  "assets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ticker: text("ticker").notNull(),
    name: text("name").notNull(),
    class: text("class").$type<AssetClass>().notNull(),
    currencyBase: text("currency_base").notNull().default("USD"),
    metadata: text("metadata", { mode: "json" })
      .$type<Record<string, unknown>>()
      .default({}),
    deletedAt: text("deleted_at"),
    ...timestamps,
  },
  (t) => [uniqueIndex("assets_ticker_uidx").on(t.ticker)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    date: text("date").notNull(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    type: text("type").$type<TransactionType>().notNull(),
    quantity: real("quantity").notNull(),
    unitPrice: real("unit_price").notNull(),
    priceCurrency: text("price_currency").notNull().default("USD"),
    fxRate: real("fx_rate").notNull().default(1),
    totalUsd: real("total_usd").notNull(),
    platform: text("platform").notNull().default("manual"),
    transactionHash: text("transaction_hash"),
    notes: text("notes"),
    importedFrom: text("imported_from"),
    importRef: text("import_ref"),
    deletedAt: text("deleted_at"),
    ...timestamps,
  },
  (t) => [
    index("transactions_asset_date_idx").on(t.assetId, t.date),
    uniqueIndex("transactions_import_uidx").on(t.importedFrom, t.importRef),
  ],
);

export const landContracts = sqliteTable("land_contracts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  landAssetId: text("land_asset_id")
    .notNull()
    .references(() => assets.id),
  seller: text("seller").notNull(),
  developer: text("developer"),
  location: text("location").notNull(),
  matricula: text("matricula").notNull(),
  surfaceM2: real("surface_m2").notNull(),
  priceLocal: real("price_local").notNull(),
  priceCurrency: text("price_currency").notNull().default("BOB"),
  signingDate: text("signing_date").notNull(),
  paymentPlan: text("payment_plan", { mode: "json" })
    .$type<LandPaymentPlan>()
    .notNull(),
  contractClauses: text("contract_clauses", { mode: "json" })
    .$type<Record<string, string>>()
    .default({}),
  estimatedValueUsd: real("estimated_value_usd"),
  status: text("status").$type<LandStatus>().notNull().default("reserved"),
  deletedAt: text("deleted_at"),
  ...timestamps,
});

export type LandPaymentPlan = {
  code?: string;
  initialPct: number;
  initialDate?: string;
  installmentsCount: number;
  installmentAmountLocal: number;
  installmentFrequency: "monthly";
  firstInstallmentDate?: string;
  balloonPct: number;
  balloonAmountLocal: number;
  balloonDate?: string;
  balloonMonthOffset?: number;
};

export const landPayments = sqliteTable(
  "land_payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    date: text("date").notNull(),
    landAssetId: text("land_asset_id")
      .notNull()
      .references(() => assets.id),
    concept: text("concept").$type<LandConcept>().notNull(),
    installmentNumber: integer("installment_number"),
    amountLocal: real("amount_local").notNull(),
    localCurrency: text("local_currency").notNull().default("BOB"),
    fxRate: real("fx_rate").notNull(),
    amountUsd: real("amount_usd").notNull(),
    paymentMethod: text("payment_method").notNull(),
    receiptNumber: text("receipt_number"),
    notes: text("notes"),
    deletedAt: text("deleted_at"),
    ...timestamps,
  },
  (t) => [index("land_payments_asset_date_idx").on(t.landAssetId, t.date)],
);

export const priceSnapshots = sqliteTable(
  "price_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    date: text("date").notNull(),
    priceUsd: real("price_usd").notNull(),
    source: text("source").$type<PriceSource>().notNull().default("manual"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index("price_snapshots_asset_date_idx").on(t.assetId, t.date),
    uniqueIndex("price_snapshots_asset_date_uidx").on(t.assetId, t.date),
  ],
);

export const fxRates = sqliteTable(
  "fx_rates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    date: text("date").notNull(),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rate: real("rate").notNull(),
    source: text("source").$type<FxSource>().notNull().default("manual"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index("fx_rates_pair_date_idx").on(t.fromCurrency, t.toCurrency, t.date),
    uniqueIndex("fx_rates_pair_date_uidx").on(
      t.fromCurrency,
      t.toCurrency,
      t.date,
    ),
  ],
);

export type SnapshotByClass = Record<
  string,
  { invested: number; value: number }
>;

export type SnapshotByAsset = Record<
  string,
  {
    ticker: string;
    class: AssetClass;
    quantity: number;
    invested: number;
    value: number;
  }
>;

export const monthlySnapshots = sqliteTable(
  "monthly_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    snapshotDate: text("snapshot_date").notNull(),
    totalInvestedUsd: real("total_invested_usd").notNull(),
    totalMarketValueUsd: real("total_market_value_usd").notNull(),
    byClass: text("by_class", { mode: "json" })
      .$type<SnapshotByClass>()
      .notNull(),
    byAsset: text("by_asset", { mode: "json" })
      .$type<SnapshotByAsset>()
      .notNull(),
    landCommittedUsd: real("land_committed_usd").notNull().default(0),
    landPaidUsd: real("land_paid_usd").notNull().default(0),
    landRemainingUsd: real("land_remaining_usd").notNull().default(0),
    monthlyContributionUsd: real("monthly_contribution_usd")
      .notNull()
      .default(0),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex("monthly_snapshots_date_uidx").on(t.snapshotDate),
  ],
);

export const userConfig = sqliteTable("user_config", {
  id: text("id").primaryKey().default("default"),
  displayCurrency: text("display_currency")
    .$type<DisplayCurrency>()
    .notNull()
    .default("USD"),
  fireTargetAmount: real("fire_target_amount").default(1_000_000),
  fireTargetDate: text("fire_target_date"),
  fireExpectedReturn: real("fire_expected_return").default(0.07),
  fireExpectedContribution: real("fire_expected_contribution").default(2000),
  eurUsdThreshold: real("eur_usd_threshold").default(50_000),
  timezone: text("timezone").notNull().default("America/La_Paz"),
  notificationPreferences: text("notification_preferences", { mode: "json" })
    .$type<Record<string, boolean>>()
    .default({}),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type LandContract = typeof landContracts.$inferSelect;
export type NewLandContract = typeof landContracts.$inferInsert;
export type LandPayment = typeof landPayments.$inferSelect;
export type NewLandPayment = typeof landPayments.$inferInsert;
export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type FxRate = typeof fxRates.$inferSelect;
export type MonthlySnapshot = typeof monthlySnapshots.$inferSelect;
export type UserConfig = typeof userConfig.$inferSelect;
