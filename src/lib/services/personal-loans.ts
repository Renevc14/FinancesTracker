import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  personalLoans,
  type PersonalLoan,
  type PersonalLoanStatus,
} from "@/lib/db/schema";
import { getPortfolioDashboard } from "@/lib/services/portfolio";
import { getLatestFxRate } from "@/lib/services/fx";

export async function listPersonalLoans(status?: PersonalLoanStatus) {
  const rows = await db
    .select()
    .from(personalLoans)
    .where(
      status
        ? and(isNull(personalLoans.deletedAt), eq(personalLoans.status, status))
        : isNull(personalLoans.deletedAt),
    )
    .orderBy(desc(personalLoans.amountUsd));
  return rows;
}

async function amountToUsd(amount: number, currency: string): Promise<{
  amountUsd: number;
  fxRate: number;
}> {
  const cur = currency.toUpperCase();
  if (cur === "USD") return { amountUsd: amount, fxRate: 1 };
  if (cur === "BOB") {
    const bobPerUsd = (await getLatestFxRate("USD", "BOB")) ?? 12.3;
    return { amountUsd: amount / bobPerUsd, fxRate: bobPerUsd };
  }
  if (cur === "EUR") {
    const eurPerUsd = (await getLatestFxRate("USD", "EUR")) ?? 0.92;
    return { amountUsd: amount / eurPerUsd, fxRate: eurPerUsd };
  }
  return { amountUsd: amount, fxRate: 1 };
}

export async function createPersonalLoan(input: {
  counterparty: string;
  amount: number;
  currency: "USD" | "BOB" | "EUR";
  date: string;
  notes?: string;
  direction?: "lent" | "borrowed";
}): Promise<PersonalLoan> {
  const { amountUsd, fxRate } = await amountToUsd(input.amount, input.currency);
  const [row] = await db
    .insert(personalLoans)
    .values({
      counterparty: input.counterparty.trim(),
      direction: input.direction ?? "lent",
      amount: input.amount,
      currency: input.currency,
      amountUsd,
      fxRate,
      date: input.date,
      notes: input.notes?.trim() || null,
      status: "open",
    })
    .returning();
  return row;
}

export async function setPersonalLoanStatus(
  id: string,
  status: PersonalLoanStatus,
) {
  const [row] = await db
    .update(personalLoans)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(personalLoans.id, id), isNull(personalLoans.deletedAt)))
    .returning();
  return row;
}

export async function deletePersonalLoan(id: string) {
  await db
    .update(personalLoans)
    .set({
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(personalLoans.id, id));
}

export async function getLoansOverview() {
  const dash = await getPortfolioDashboard();
  const people = await listPersonalLoans();
  const openLent = people.filter((p) => p.direction === "lent" && p.status === "open");
  const repaidLent = people.filter(
    (p) => p.direction === "lent" && p.status === "repaid",
  );
  const openBorrowed = people.filter(
    (p) => p.direction === "borrowed" && p.status === "open",
  );
  return {
    displayCurrency: dash.displayCurrency,
    fx: dash.fxToDisplay,
    owedCrypto: dash.loans,
    owedCryptoUsd: dash.debtUsd,
    lent: openLent,
    lentUsd: openLent.reduce((s, p) => s + p.amountUsd, 0),
    lentRepaid: repaidLent,
    borrowedPersonal: openBorrowed,
    borrowedPersonalUsd: openBorrowed.reduce((s, p) => s + p.amountUsd, 0),
  };
}
