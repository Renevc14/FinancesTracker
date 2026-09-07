import Link from "next/link";
import { listBankAccounts } from "@/lib/services/banks";
import { BankAccountForm, BankBalanceForm } from "@/components/forms/bank-forms";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BanksPage() {
  const rows = await listBankAccounts();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="ios-back">
          ‹ Settings
        </Link>
        <h1 className="mt-2 ios-large-title">Banks</h1>
      </div>
      <ul className="ios-group">
        {rows.length === 0 && (
          <li className="px-4 py-6 text-[15px] text-[var(--muted)]">None yet</li>
        )}
        {rows.map(({ account, latest }) => (
          <li key={account.id} className="space-y-3 p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="ios-headline">{account.name}</p>
                <p className="text-[13px] text-[var(--muted)]">
                  {account.bank} · {account.currency}
                </p>
              </div>
              <p className="money text-[15px] font-semibold">
                {latest ? formatMoney(latest.balanceUsd, "USD") : "—"}
              </p>
            </div>
            <BankBalanceForm accountId={account.id} />
          </li>
        ))}
      </ul>
      <section className="ios-group space-y-3 p-4">
        <h2 className="ios-title">New account</h2>
        <BankAccountForm />
      </section>
    </div>
  );
}
