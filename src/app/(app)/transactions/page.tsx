import Link from "next/link";
import { listTransactionsAction } from "@/lib/actions";
import { txTypeLabel } from "@/lib/labels";
import { formatDate, formatMoney, formatQuantity } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const rows = await listTransactionsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ios-large-title">Movimientos</h1>
          <p className="mt-1 text-[15px] text-[var(--muted)]">
            Cripto, acciones y estables
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 pb-0.5">
          <Link
            href="/transactions/new"
            className="ios-pressable inline-flex h-9 items-center rounded-full bg-[var(--accent)] px-4 text-[15px] font-semibold text-white"
          >
            Nuevo
          </Link>
          <Link
            href="/transactions/import"
            className="text-[13px] font-medium text-[var(--accent)]"
          >
            Importar CSV
          </Link>
        </div>
      </div>

      <ul className="ios-group">
        {rows.length === 0 && (
          <li className="px-4 py-8 text-center text-[15px] text-[var(--muted)]">
            Sin movimientos.{" "}
            <Link href="/transactions/new" className="text-[var(--accent)]">
              Crear el primero
            </Link>
          </li>
        )}
        {rows.map((tx) => (
          <li key={tx.id} className="ios-row">
            <div className="min-w-0">
              <p className="ios-headline truncate">{tx.ticker}</p>
              <p className="truncate text-[13px] text-[var(--muted)]">
                {formatDate(tx.date)} · {txTypeLabel(tx.type)}
                {tx.notes ? ` · ${tx.notes}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="money text-[15px] font-semibold">
                {formatMoney(tx.totalUsd, "USD")}
              </p>
              <p className="text-[12px] text-[var(--muted-2)]">
                {formatQuantity(tx.quantity)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
