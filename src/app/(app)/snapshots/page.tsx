import Link from "next/link";
import { CaptureSnapshotButton } from "@/components/forms/capture-snapshot-button";
import { listSnapshots } from "@/lib/services/snapshot";
import { formatDate, formatMoney, formatPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SnapshotsPage() {
  const snaps = await listSnapshots();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Snapshots</h1>
          <p className="text-sm text-[var(--muted)]">
            Fotografía mensual del patrimonio
          </p>
        </div>
        <CaptureSnapshotButton />
      </div>

      <ul className="space-y-3">
        {snaps.length === 0 && (
          <li className="text-sm text-[var(--muted)]">
            Aún no hay snapshots. Captura el primero.
          </li>
        )}
        {snaps.map((s, i) => {
          const prev = snaps[i + 1];
          const delta = prev
            ? s.totalMarketValueUsd - prev.totalMarketValueUsd
            : 0;
          const deltaPct =
            prev && prev.totalMarketValueUsd !== 0
              ? (delta / prev.totalMarketValueUsd) * 100
              : 0;

          return (
            <li key={s.id}>
              <Link
                href={`/snapshots/${s.snapshotDate}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-4 hover:border-[var(--accent)]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg">
                      {formatDate(s.snapshotDate)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Invertido {formatMoney(s.totalInvestedUsd, "USD")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium">
                      {formatMoney(s.totalMarketValueUsd, "USD")}
                    </p>
                    {prev && (
                      <p
                        className={`text-xs ${delta >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                      >
                        {delta >= 0 ? "+" : ""}
                        {formatMoney(delta, "USD")} ({formatPct(deltaPct)})
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
