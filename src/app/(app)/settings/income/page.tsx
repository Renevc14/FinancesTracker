import Link from "next/link";
import { SalaryConfigForm } from "@/components/forms/salary-config-form";
import { getSavingsSummary, monthBefore } from "@/lib/services/savings";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IncomeSettingsPage() {
  const savings = await getSavingsSummary();
  const previous = monthBefore(savings.current.yearMonth);
  const fromMonth =
    previous && previous >= savings.months[0]!.yearMonth
      ? previous
      : savings.current.yearMonth;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-[15px] text-[var(--accent)]">
          ← Settings
        </Link>
        <h1 className="ios-large-title mt-2">Salary</h1>
      </div>

      <section className="ios-group p-4">
        <SalaryConfigForm
          amount={savings.monthlySalaryUsd}
          fromMonth={fromMonth}
          months={savings.months.map((month) => ({
            value: month.yearMonth,
            label: month.label,
          }))}
        />
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">By month</p>
        <ul className="ios-group">
          {savings.months.map((month) => (
            <li key={month.yearMonth} className="ios-row">
              <div>
                <p className="ios-headline">{month.label}</p>
                <p className="text-[13px] text-[var(--muted)]">
                  {month.source === "invoice" ? "Invoice" : "Salary"}
                </p>
              </div>
              <p className="money text-[17px] font-semibold">
                {formatMoney(month.salaryUsd, "USD")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
