import { isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { incomeMonths, landPayments, transactions } from "@/lib/db/schema";
import { PORTFOLIO_START_DATE } from "@/lib/exchanges/binance";
import { formatMonthYear, localISODate } from "@/lib/utils";

export type SavingsMonth = {
  yearMonth: string;
  label: string;
  salaryUsd: number;
  investedUsd: number;
  ratioPct: number;
  source: "invoice" | "salary";
};

export type SavingsSummary = {
  months: SavingsMonth[];
  current: SavingsMonth;
  totalSalaryUsd: number;
  totalInvestedUsd: number;
  totalRatioPct: number;
  monthlySalaryUsd: number;
};

function yearMonthsThrough(endDate: string): string[] {
  const start = PORTFOLIO_START_DATE.slice(0, 7);
  const end = endDate.slice(0, 7);
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function ratioPct(invested: number, salary: number): number {
  if (salary <= 0) return 0;
  return (invested / salary) * 100;
}

export async function getSavingsSummary(): Promise<SavingsSummary> {
  const config = await db.query.userConfig.findFirst();
  const monthlySalaryUsd = config?.monthlySalaryUsd ?? 2060;
  const overrides = await db.select().from(incomeMonths);
  const byMonth = new Map(overrides.map((row) => [row.yearMonth, row]));

  const txs = await db
    .select()
    .from(transactions)
    .where(isNull(transactions.deletedAt));
  const pays = await db
    .select()
    .from(landPayments)
    .where(isNull(landPayments.deletedAt));

  const investedByMonth = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type !== "buy") continue;
    const key = tx.date.slice(0, 7);
    investedByMonth.set(key, (investedByMonth.get(key) ?? 0) + tx.totalUsd);
  }
  for (const pay of pays) {
    const key = pay.date.slice(0, 7);
    investedByMonth.set(key, (investedByMonth.get(key) ?? 0) + pay.amountUsd);
  }

  const months = yearMonthsThrough(localISODate()).map((yearMonth) => {
    const override = byMonth.get(yearMonth);
    const salaryUsd = override?.amountUsd ?? monthlySalaryUsd;
    const investedUsd = investedByMonth.get(yearMonth) ?? 0;
    return {
      yearMonth,
      label: formatMonthYear(`${yearMonth}-01`),
      salaryUsd,
      investedUsd,
      ratioPct: ratioPct(investedUsd, salaryUsd),
      source: (override?.source ?? "salary") as "invoice" | "salary",
    };
  });

  const totalSalaryUsd = months.reduce((s, m) => s + m.salaryUsd, 0);
  const totalInvestedUsd = months.reduce((s, m) => s + m.investedUsd, 0);
  const current = months[months.length - 1] ?? {
    yearMonth: localISODate().slice(0, 7),
    label: "This month",
    salaryUsd: monthlySalaryUsd,
    investedUsd: 0,
    ratioPct: 0,
    source: "salary" as const,
  };

  return {
    months,
    current,
    totalSalaryUsd,
    totalInvestedUsd,
    totalRatioPct: ratioPct(totalInvestedUsd, totalSalaryUsd),
    monthlySalaryUsd,
  };
}
