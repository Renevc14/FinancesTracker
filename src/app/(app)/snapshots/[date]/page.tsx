import Link from "next/link";
import { notFound } from "next/navigation";
import { getSnapshot } from "@/lib/services/snapshot";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const snap = await getSnapshot(date);
  if (!snap) notFound();

  const byClass = Object.entries(snap.byClass);
  const byAsset = Object.values(snap.byAsset);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/snapshots"
          className="text-xs text-[var(--accent)] hover:underline"
        >
          ← Snapshots
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          {formatDate(snap.snapshotDate)}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Invertido" value={formatMoney(snap.totalInvestedUsd, "USD")} />
        <Tile label="Valor" value={formatMoney(snap.totalMarketValueUsd, "USD")} />
        <Tile label="Terrenos pagado" value={formatMoney(snap.landPaidUsd, "USD")} />
        <Tile
          label="Aporte del mes"
          value={formatMoney(snap.monthlyContributionUsd, "USD")}
        />
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-xl">Por clase</h2>
        <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]/70">
          {byClass.map(([cls, v]) => (
            <li key={cls} className="flex justify-between px-4 py-3 text-sm">
              <span className="capitalize">{cls}</span>
              <span className="font-mono">
                {formatMoney(v.value, "USD")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl">Por activo</h2>
        <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]/70">
          {byAsset.map((a) => (
            <li key={a.ticker} className="flex justify-between px-4 py-3 text-sm">
              <span>
                {a.ticker}{" "}
                <span className="text-[var(--muted)]">· {a.class}</span>
              </span>
              <span className="font-mono">{formatMoney(a.value, "USD")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
