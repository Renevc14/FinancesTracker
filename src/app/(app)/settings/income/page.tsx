import Link from "next/link";
import { SalaryConfigForm } from "@/components/forms/salary-config-form";
import { db } from "@/lib/db";
import { incomeMonths } from "@/lib/db/schema";
import { getSavingsSummary } from "@/lib/services/savings";
import { formatMoney, formatMonthYear } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IncomeSettingsPage() {
  const savings = await getSavingsSummary();
  const invoices = await db.select().from(incomeMonths);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-[15px] text-[var(--accent)]">
          ← Settings
        </Link>
        <h1 className="ios-large-title mt-2">Salary</h1>
      </div>

      <section className="ios-group p-4">
        <SalaryConfigForm amount={savings.monthlySalaryUsd} />
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">Invoices</p>
        <ul className="ios-group">
          {invoices
            .slice()
            .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
            .map((row) => (
              <li key={row.id} className="ios-row">
                <div>
                  <p className="ios-headline">
                    {formatMonthYear(`${row.yearMonth}-01`)}
                  </p>
                  <p className="text-[13px] text-[var(--muted)]">
                    {row.notes ?? "Invoice"}
                  </p>
                </div>
                <p className="money text-[17px] font-semibold">
                  {formatMoney(row.amountUsd, "USD")}
                </p>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
