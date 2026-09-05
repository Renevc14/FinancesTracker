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

async function main() {
  const client = createClient({
    url: resolveUrl(),
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  console.log("Seeding…");

  // Order matters for FKs
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

  await db.insert(schema.fxRates).values([
    {
      date: today,
      fromCurrency: "USD",
      toCurrency: "BOB",
      rate: 12.5,
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
    { assetId: byTicker.BTC.id, date: today, priceUsd: 95000, source: "manual" },
    { assetId: byTicker.ETH.id, date: today, priceUsd: 3500, source: "manual" },
    { assetId: byTicker.SOL.id, date: today, priceUsd: 180, source: "manual" },
    { assetId: byTicker.USDC.id, date: today, priceUsd: 1, source: "manual" },
    { assetId: byTicker.VUAA.id, date: today, priceUsd: 110, source: "manual" },
  ]);

  const plan15: LandPaymentPlan = {
    code: "OC-AUTOFAST-36-5-40-55",
    initialPct: 0.05,
    initialDate: "2026-09-30",
    installmentsCount: 36,
    installmentAmountLocal: 3500,
    installmentFrequency: "monthly",
    firstInstallmentDate: "2026-10-30",
    balloonPct: 0.55,
    balloonAmountLocal: Math.round(314186 * 0.55),
    balloonMonthOffset: 37,
  };

  const plan16: LandPaymentPlan = {
    ...plan15,
    initialDate: "2026-12-30",
    firstInstallmentDate: "2027-01-30",
    balloonAmountLocal: Math.round(314094 * 0.55),
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
      priceLocal: 314186,
      priceCurrency: "BOB",
      signingDate: "2026-09-30",
      paymentPlan: plan15,
      contractClauses: clauses,
      estimatedValueUsd: 314186 / 12.5,
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
      estimatedValueUsd: 314094 / 12.5,
      status: "reserved",
    },
  ]);

  console.log("Seed OK — assets, FX, Berchatti lots M-176-15 / M-176-16");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
