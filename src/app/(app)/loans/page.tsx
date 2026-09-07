import Link from "next/link";
import { PersonalLoanActions } from "@/components/forms/personal-loan-actions";
import { getLoansOverview } from "@/lib/services/personal-loans";
import { convertFromUsd } from "@/lib/services/portfolio";
import { formatDate, formatMoney, formatQuantity } from "@/lib/utils";
import type { PersonalLoan } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  const data = await getLoansOverview();
  const money = (usd: number) =>
    formatMoney(convertFromUsd(usd, data.fx), data.displayCurrency);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Link
          href="/loans/new"
          className="ios-pressable inline-flex h-8 items-center rounded-full bg-[var(--accent)] px-4 text-[15px] font-semibold text-[var(--accent-fg)]"
        >
          New
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="ios-title">Lent</h2>
          {data.lentUsd > 0 && (
            <p className="money text-[15px] font-semibold">{money(data.lentUsd)}</p>
          )}
        </div>
        <ul className="ios-group">
          {data.lent.length === 0 && (
            <li className="px-4 py-6 text-center text-[15px] text-[var(--muted)]">
              None
            </li>
          )}
          {data.lent.map((loan) => (
            <PersonalLoanRow key={loan.id} loan={loan} money={money} />
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="ios-title">Borrowed</h2>
          {data.owedCryptoUsd + data.borrowedPersonalUsd > 0 && (
            <p className="money text-[15px] font-semibold text-[var(--negative)]">
              −{money(data.owedCryptoUsd + data.borrowedPersonalUsd)}
            </p>
          )}
        </div>
        <ul className="ios-group">
          {data.owedCrypto.length === 0 && data.borrowedPersonal.length === 0 && (
            <li className="px-4 py-6 text-center text-[15px] text-[var(--muted)]">
              None
            </li>
          )}
          {data.owedCrypto.map((loan) => (
            <li
              key={`${loan.loanCoin}-${loan.collateralCoin}`}
              className="ios-row"
            >
              <div className="min-w-0">
                <p className="ios-headline">
                  Binance · {formatQuantity(loan.totalDebt)} {loan.loanCoin}
                </p>
                <p className="text-[13px] text-[var(--muted)]">
                  Collateral {formatQuantity(loan.collateralAmount)}{" "}
                  {loan.collateralCoin}
                  {loan.currentLtv != null
                    ? ` · LTV ${(loan.currentLtv * 100).toFixed(1)}%`
                    : ""}
                </p>
              </div>
              <p className="money text-[17px] font-semibold text-[var(--negative)]">
                −{money(loan.debtUsd)}
              </p>
            </li>
          ))}
          {data.borrowedPersonal.map((loan) => (
            <PersonalLoanRow key={loan.id} loan={loan} money={money} />
          ))}
        </ul>
      </section>

      {data.lentRepaid.length > 0 && (
        <section className="space-y-3">
          <h2 className="ios-title px-0.5">Repaid</h2>
          <ul className="ios-group opacity-70">
            {data.lentRepaid.map((loan) => (
              <PersonalLoanRow key={loan.id} loan={loan} money={money} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PersonalLoanRow({
  loan,
  money,
}: {
  loan: PersonalLoan;
  money: (usd: number) => string;
}) {
  return (
    <li className="space-y-1 border-b border-[var(--separator)] px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ios-headline">{loan.counterparty}</p>
          <p className="text-[13px] text-[var(--muted)]">
            {formatMoney(loan.amount, loan.currency)} · {formatDate(loan.date)}
          </p>
        </div>
        <p className="money shrink-0 text-[17px] font-semibold">
          {money(loan.amountUsd)}
        </p>
      </div>
      <PersonalLoanActions id={loan.id} status={loan.status} />
    </li>
  );
}
