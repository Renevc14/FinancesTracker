import Link from "next/link";
import { CaptureSnapshotButton } from "@/components/forms/capture-snapshot-button";
import { listSnapshots } from "@/lib/services/snapshot";
import { formatDate, formatMoney, formatPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SnapshotsPage() {
  const snaps = await listSnapshots();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Link href="/settings" className="ios-back">
            ‹ Settings
          </Link>
          <h1 className="mt-2 ios-large-title">Snapshots</h1>
        </div>
        <CaptureSnapshotButton />
      </div>

      <ul className="ios-group">
        {snaps.length === 0 && (
          <li className="px-4 py-8 text-center text-[15px] text-[var(--muted)]">
            None yet
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
              <Link href={`/snapshots/${s.snapshotDate}`} className="ios-row ios-pressable">
                <div className="min-w-0">
                  <p className="ios-headline">{formatDate(s.snapshotDate)}</p>
                  <p className="text-[13px] text-[var(--muted)]">
                    Cost {formatMoney(s.totalInvestedUsd, "USD")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="money text-[17px] font-semibold">
                    {formatMoney(s.totalMarketValueUsd, "USD")}
                  </p>
                  {prev && (
                    <p
                      className={`text-[13px] ${delta >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                    >
                      {delta >= 0 ? "+" : ""}
                      {formatMoney(delta, "USD")} ({formatPct(deltaPct)})
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
