import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "../src/lib/db/schema";
import type { LandPaymentPlan } from "../src/lib/db/schema";

function resolveUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/portfolio.db";
  if (url.startsWith("file:")) {
    const filePath = url.replace(/^file:/, "");
    const absolute = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    return `file:${absolute}`;
  }
  return url;
}

/** Snapshot of portafolio_tracker_v2.xlsx (Transacciones + Terrenos + Resumen). */
const EXCEL_TXS: Array<{
  date: string;
  ticker: string;
  quantity: number;
  unitPrice: number;
  totalUsd: number;
  notes: string;
  platform: string;
}> = [
  {
    date: "2026-02-05",
    ticker: "BTC",
    quantity: 0.00286,
    unitPrice: 69928.42,
    totalUsd: 199.9952812,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-02-05",
    ticker: "BTC",
    quantity: 0.00158,
    unitPrice: 63000,
    totalUsd: 99.54,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-02-12",
    ticker: "BTC",
    quantity: 0.00007,
    unitPrice: 67951.99,
    totalUsd: 4.7566393,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-02-12",
    ticker: "BTC",
    quantity: 0.00287,
    unitPrice: 67951.99,
    totalUsd: 195.0222113,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-02-12",
    ticker: "BTC",
    quantity: 0.00153,
    unitPrice: 65500,
    totalUsd: 100.215,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-03-08",
    ticker: "BTC",
    quantity: 0.00296,
    unitPrice: 66100,
    totalUsd: 195.656,
    notes: "Spot BTC/USDT",
    platform: "binance",
  },
  {
    date: "2026-03-11",
    ticker: "BTC",
    quantity: 0.00215,
    unitPrice: 69500,
    totalUsd: 149.425,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-03-22",
    ticker: "BTC",
    quantity: 0.00147,
    unitPrice: 67804.06,
    totalUsd: 99.6719682,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-05-09",
    ticker: "USDC",
    quantity: 600,
    unitPrice: 1,
    totalUsd: 600,
    notes: "Reserva / fondo de aterrizaje",
    platform: "manual",
  },
  {
    date: "2026-05-09",
    ticker: "BTC",
    quantity: 0.0099,
    unitPrice: 80735,
    totalUsd: 799.2765,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-06-03",
    ticker: "BTC",
    quantity: 0.01527,
    unitPrice: 65468.76,
    totalUsd: 999.7079652,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-06-05",
    ticker: "BTC",
    quantity: 0.00483,
    unitPrice: 62000,
    totalUsd: 299.46,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-06-05",
    ticker: "BTC",
    quantity: 0.00154,
    unitPrice: 61000,
    totalUsd: 93.94,
    notes: "Spot BTC/USDC",
    platform: "binance",
  },
  {
    date: "2026-07-14",
    ticker: "VUAA",
    quantity: 0.6,
    unitPrice: 146,
    totalUsd: 87.6,
    notes: "IBKR",
    platform: "ibkr",
  },
];

async function main() {
  const client = createClient({
    url: resolveUrl(),
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  console.log("Seeding from Excel snapshot…");

  await db.delete(schema.monthlySnapshots);
  await db.delete(schema.landPayments);
  await db.delete(schema.landContracts);
  await db.delete(schema.transactions);
  await db.delete(schema.priceSnapshots);
  await db.delete(schema.fxRates);
  await db.delete(schema.assets);
  await db.delete(schema.userConfig);

  await db.insert(schema.userConfig).values({
    id: "default",
    displayCurrency: "USD",
    fireTargetAmount: 1_000_000,
    fireExpectedReturn: 0.07,
    fireExpectedContribution: 2000,
    eurUsdThreshold: 50_000,
    timezone: "America/La_Paz",
    notificationPreferences: {},
  });

  const today = new Date().toISOString().slice(0, 10);
  const bobPerUsd = 12.3;

  await db.insert(schema.fxRates).values([
    {
      date: today,
      fromCurrency: "USD",
      toCurrency: "BOB",
      rate: bobPerUsd,
      source: "paralelo_manual",
    },
    {
      date: today,
      fromCurrency: "USD",
      toCurrency: "EUR",
      rate: 0.92,
      source: "manual",
    },
    {
      date: today,
      fromCurrency: "EUR",
      toCurrency: "USD",
      rate: 1.087,
      source: "manual",
    },
  ]);

  const inserted = await db
    .insert(schema.assets)
    .values([
      {
        ticker: "BTC",
        name: "Bitcoin",
        class: "crypto",
        currencyBase: "USD",
        metadata: { blockchain: "bitcoin", custody: "binance_spot" },
      },
      {
        ticker: "ETH",
        name: "Ethereum",
        class: "crypto",
        currencyBase: "USD",
        metadata: { blockchain: "ethereum", custody: "binance_spot" },
      },
      {
        ticker: "SOL",
        name: "Solana",
        class: "crypto",
        currencyBase: "USD",
        metadata: { blockchain: "solana", custody: "binance_spot" },
      },
      {
        ticker: "USDC",
        name: "USD Coin",
        class: "stable",
        currencyBase: "USD",
        metadata: { custody: "binance_spot" },
      },
      {
        ticker: "USDT",
        name: "Tether",
        class: "stable",
        currencyBase: "USD",
        metadata: { custody: "binance_spot" },
      },
      {
        ticker: "VUAA",
        name: "Vanguard S&P 500 UCITS",
        class: "stock",
        currencyBase: "USD",
        metadata: {
          isin: "IE00BFMXXD54",
          domicile: "IE",
          distribution_type: "accumulating",
          expense_ratio: 0.0007,
        },
      },
      {
        ticker: "M-176-15",
        name: "Lote M-176 · 15",
        class: "land",
        currencyBase: "BOB",
        metadata: {
          lot_id: "M-176-15",
          surface_m2: 238.02,
          location: "Urubó, Porongo",
          matricula: "7013020009967",
        },
      },
      {
        ticker: "M-176-16",
        name: "Lote M-176 · 16",
        class: "land",
        currencyBase: "BOB",
        metadata: {
          lot_id: "M-176-16",
          surface_m2: 237.95,
          location: "Urubó, Porongo",
          matricula: "7013020009967",
        },
      },
    ])
    .returning();

  const byTicker = Object.fromEntries(inserted.map((a) => [a.ticker, a]));

  await db.insert(schema.priceSnapshots).values([
    { assetId: byTicker.BTC.id, date: today, priceUsd: 79000, source: "manual" },
    { assetId: byTicker.ETH.id, date: today, priceUsd: 3500, source: "manual" },
    { assetId: byTicker.SOL.id, date: today, priceUsd: 180, source: "manual" },
    { assetId: byTicker.USDC.id, date: today, priceUsd: 1, source: "manual" },
    { assetId: byTicker.USDT.id, date: today, priceUsd: 1, source: "manual" },
    { assetId: byTicker.VUAA.id, date: today, priceUsd: 150, source: "manual" },
  ]);

      await db.insert(schema.transactions).values(
    EXCEL_TXS.map((tx, i) => {
      const asset = byTicker[tx.ticker];
      if (!asset) throw new Error(`Unknown ticker ${tx.ticker}`);
      return {
        date: tx.date,
        assetId: asset.id,
        type: "buy" as const,
        quantity: tx.quantity,
        unitPrice: tx.unitPrice,
        priceCurrency: "USD",
        fxRate: 1,
        totalUsd: tx.totalUsd,
        platform: tx.platform,
        notes: tx.notes,
        importedFrom: "excel_v2",
        importRef: `excel-tx-${i + 1}`,
      };
    }),
  );

  const plan15: LandPaymentPlan = {
    code: "OC-AUTOFAST-36-5-40-55",
    initialPct: 0.05,
    initialDate: "2026-09-30",
    installmentsCount: 36,
    installmentAmountLocal: 3500,
    installmentFrequency: "monthly",
    firstInstallmentDate: "2026-10-30",
    balloonPct: 0.55,
    balloonAmountLocal: 314186.4 * 0.55,
    balloonDate: "2029-10-30",
    balloonMonthOffset: 37,
  };

  const plan16: LandPaymentPlan = {
    ...plan15,
    initialDate: "2026-12-30",
    firstInstallmentDate: "2027-01-30",
    balloonAmountLocal: 314094 * 0.55,
  };

  const clauses: Record<string, string> = {
    "6.1": "Sin fecha de entrega",
    "7.3_14.1": "Vendedor puede hipotecar, comprador no puede inscribir anotación",
    "10.1": "Mora automática",
    "12.2": "Rescisión: retienen 5%",
    "13.4": "Cesión: USD 200 + consentimiento + cuotas al día",
    "15.2": "DS 4732 no certificado",
    "19": "Arbitraje CAINCO",
  };

  await db.insert(schema.landContracts).values([
    {
      landAssetId: byTicker["M-176-15"].id,
      seller: "Inmobiliaria Menorah SRL",
      developer: "Korban (informal, no en contrato)",
      location: "Urubó, Porongo, Bolivia",
      matricula: "7013020009967",
      surfaceM2: 238.02,
      priceLocal: 314186.4,
      priceCurrency: "BOB",
      signingDate: "2026-09-30",
      paymentPlan: plan15,
      contractClauses: clauses,
      estimatedValueUsd: 314186.4 / bobPerUsd,
      status: "reserved",
    },
    {
      landAssetId: byTicker["M-176-16"].id,
      seller: "Inmobiliaria Menorah SRL",
      developer: "Korban (informal, no en contrato)",
      location: "Urubó, Porongo, Bolivia",
      matricula: "7013020009967",
      surfaceM2: 237.95,
      priceLocal: 314094,
      priceCurrency: "BOB",
      signingDate: "2026-12-30",
      paymentPlan: plan16,
      contractClauses: clauses,
      estimatedValueUsd: 314094 / bobPerUsd,
      status: "reserved",
    },
  ]);

  const reservaNotes =
    "Reserva pre-firma. Recuperable si no firmo el 30/sep. Folio 7013020009967. Bs 348×2 = $100 a 6.96; asentado a FX paralelo 12.3.";

  await db.insert(schema.landPayments).values([
    {
      date: "2026-08-15",
      landAssetId: byTicker["M-176-15"].id,
      concept: "reservation",
      amountLocal: 348,
      localCurrency: "BOB",
      fxRate: bobPerUsd,
      amountUsd: 348 / bobPerUsd,
      paymentMethod: "USDT/P2P",
      notes: reservaNotes,
    },
    {
      date: "2026-08-15",
      landAssetId: byTicker["M-176-16"].id,
      concept: "reservation",
      amountLocal: 348,
      localCurrency: "BOB",
      fxRate: bobPerUsd,
      amountUsd: 348 / bobPerUsd,
      paymentMethod: "USDT/P2P",
      notes: reservaNotes,
    },
  ]);

  console.log(
    "Seed OK — Excel v2: 14 txs, FX 12.3, BTC 79k / VUAA 150, reserva Berchatti",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
