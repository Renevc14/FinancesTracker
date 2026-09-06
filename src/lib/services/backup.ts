import { db } from "@/lib/db";
import {
  assets,
  bankAccounts,
  bankBalanceSnapshots,
  fxRates,
  landContracts,
  landPayments,
  monthlySnapshots,
  priceSnapshots,
  transactions,
  userConfig,
} from "@/lib/db/schema";

export async function exportBackupJson(): Promise<string> {
  const [
    assetRows,
    txRows,
    landRows,
    payRows,
    fxRows,
    priceRows,
    snapRows,
    configRows,
    bankRows,
    bankSnapRows,
  ] = await Promise.all([
    db.select().from(assets),
    db.select().from(transactions),
    db.select().from(landContracts),
    db.select().from(landPayments),
    db.select().from(fxRates),
    db.select().from(priceSnapshots),
    db.select().from(monthlySnapshots),
    db.select().from(userConfig),
    db.select().from(bankAccounts),
    db.select().from(bankBalanceSnapshots),
  ]);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "Patrimonio",
      assets: assetRows,
      transactions: txRows,
      landContracts: landRows,
      landPayments: payRows,
      fxRates: fxRows,
      priceSnapshots: priceRows,
      monthlySnapshots: snapRows,
      userConfig: configRows,
      bankAccounts: bankRows,
      bankBalanceSnapshots: bankSnapRows,
    },
    null,
    2,
  );
}
