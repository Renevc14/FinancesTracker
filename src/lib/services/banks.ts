import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankAccounts, bankBalanceSnapshots } from "@/lib/db/schema";
import { getLatestFxRate } from "@/lib/services/fx";
import { localISODate } from "@/lib/utils";

export async function listBankAccounts() {
  const accounts = await db.select().from(bankAccounts).orderBy(bankAccounts.name);
  const withLatest = [];
  for (const account of accounts) {
    const latest = await db.query.bankBalanceSnapshots.findFirst({
      where: eq(bankBalanceSnapshots.accountId, account.id),
      orderBy: [desc(bankBalanceSnapshots.date), desc(bankBalanceSnapshots.createdAt)],
    });
    withLatest.push({ account, latest });
  }
  return withLatest;
}

export async function createBankAccount(input: {
  name: string;
  bank: string;
  currency: string;
  accountType: "checking" | "savings";
}) {
  const [row] = await db
    .insert(bankAccounts)
    .values({
      name: input.name,
      bank: input.bank,
      currency: input.currency,
      accountType: input.accountType,
    })
    .returning();
  return row;
}

export async function addBankBalance(input: {
  accountId: string;
  balanceLocal: number;
  notes?: string;
}) {
  const account = await db.query.bankAccounts.findFirst({
    where: eq(bankAccounts.id, input.accountId),
  });
  if (!account) throw new Error("Cuenta no encontrada");
  const fx =
    account.currency === "USD"
      ? 1
      : ((await getLatestFxRate("USD", account.currency)) ?? 1);
  const balanceUsd =
    account.currency === "USD" ? input.balanceLocal : input.balanceLocal / fx;
  const [row] = await db
    .insert(bankBalanceSnapshots)
    .values({
      accountId: account.id,
      date: localISODate(),
      balanceLocal: input.balanceLocal,
      fxRate: fx,
      balanceUsd,
      notes: input.notes ?? null,
      source: "manual",
    })
    .returning();
  return row;
}
