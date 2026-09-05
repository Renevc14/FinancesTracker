import Link from "next/link";
import { listTransactionsAction } from "@/lib/actions";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const rows = await listTransactionsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Transacciones</h1>
          <p className="text-sm text-[var(--muted)]">
            Cripto, acciones y estables
          </p>
        </div>
        <Link
          href="/transactions/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)]"
        >
          Nueva
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/70">
        <ul className="divide-y divide-[var(--border)]">
          {rows.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              No hay transacciones.{" "}
              <Link href="/transactions/new" className="text-[var(--accent)]">
                Crear la primera
              </Link>
            </li>
          )}
          {rows.map((tx) => (
            <li key={tx.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {tx.ticker}{" "}
                  <span className="text-[var(--muted)]">· {tx.type}</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {formatDate(tx.date)} · {tx.platform} ·{" "}
                  {tx.quantity.toLocaleString(undefined, {
                    maximumFractionDigits: 8,
                  })}{" "}
                  @ {tx.unitPrice} {tx.priceCurrency}
                </p>
              </div>
              <p className="shrink-0 font-mono text-sm">
                {formatMoney(tx.totalUsd, "USD")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
