import { z } from "zod";
import {
  assetClasses,
  displayCurrencies,
  landConcepts,
  transactionTypes,
} from "@/lib/db/schema";

export const transactionFormSchema = z.object({
  date: z.string().min(1),
  assetId: z.string().uuid(),
  type: z.enum(transactionTypes),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  priceCurrency: z.string().min(1).default("USD"),
  fxRate: z.coerce.number().positive().default(1),
  platform: z.string().min(1),
  notes: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export const landPaymentFormSchema = z.object({
  date: z.string().min(1),
  landAssetId: z.string().uuid(),
  concept: z.enum(landConcepts),
  installmentNumber: z.coerce.number().int().positive().optional().nullable(),
  amountLocal: z.coerce.number().positive(),
  localCurrency: z.string().min(1).default("BOB"),
  fxRate: z.coerce.number().positive(),
  paymentMethod: z.string().min(1),
  discountLocal: z.preprocess(
    (v) => (v === "" || v == null ? 0 : v),
    z.coerce.number().nonnegative(),
  ),
  notes: z.string().optional(),
});

export type LandPaymentFormValues = z.infer<typeof landPaymentFormSchema>;

export const assetFormSchema = z.object({
  ticker: z.string().min(1).max(32),
  name: z.string().min(1),
  class: z.enum(assetClasses),
  currencyBase: z.string().min(1).default("USD"),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export const displayCurrencySchema = z.enum(displayCurrencies);

export const priceSnapshotFormSchema = z.object({
  assetId: z.string().uuid(),
  date: z.string().min(1),
  priceUsd: z.coerce.number().positive(),
});

export const fxRateFormSchema = z.object({
  date: z.string().min(1),
  fromCurrency: z.string().min(1),
  toCurrency: z.string().min(1),
  rate: z.coerce.number().positive(),
  source: z.enum(["manual", "api_exchangerate", "paralelo_manual"]).default("manual"),
});
