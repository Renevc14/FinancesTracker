import Link from "next/link";
import { AssetLogo } from "@/components/ui/asset-logo";
import { listTransactionsAction } from "@/lib/actions";
import { txTypeLabel } from "@/lib/labels";
import {
  formatDate,
  formatMoney,
  formatMonthYear,
  formatQuantity,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const rows = await listTransactionsAction();
  const groups = groupByMonth(rows);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ios-large-title">Movimientos</h1>
          <p className="mt-1 text-[15px] text-[var(--muted)]">
            Cripto, acciones y estables
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pb-0.5">
          <Link
            href="/transactions/new"
            className="ios-pressable inline-flex h-8 items-center rounded-full bg-[var(--accent)] px-4 text-[15px] font-semibold text-[var(--accent-fg)]"
          >
            Nuevo
          </Link>
          <Link
            href="/transactions/import"
            className="ios-pressable inline-flex min-h-11 items-center text-[15px] font-medium text-[var(--accent)]"
          >
            Importar CSV
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <ul className="ios-group">
          <li className="px-4 py-8 text-center text-[15px] text-[var(--muted)]">
            Sin movimientos.{" "}
            <Link href="/transactions/new" className="text-[var(--accent)]">
              Crear el primero
            </Link>
          </li>
        </ul>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <p className="ios-section-label">{group.label}</p>
            <ul className="ios-group">
              {group.rows.map((tx) => (
                <li key={tx.id} className="ios-row">
                  <div className="flex min-w-0 items-center gap-3">
                    <AssetLogo
                      ticker={tx.ticker}
                      assetClass={tx.assetClass}
                      size={32}
                    />
                    <div className="min-w-0">
                      <p className="ios-headline truncate">{tx.ticker}</p>
                      <p className="truncate text-[13px] text-[var(--muted)]">
                        {formatDate(tx.date)} · {txTypeLabel(tx.type)}
                        {tx.notes ? ` · ${tx.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="money text-[17px] font-semibold">
                      {formatMoney(tx.totalUsd, "USD")}
                    </p>
                    <p className="text-[13px] text-[var(--muted-2)]">
                      {formatQuantity(tx.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function groupByMonth<T extends { date: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, grouped]) => ({
    key,
    label: formatMonthYear(`${key}-01`),
    rows: grouped,
  }));
}
