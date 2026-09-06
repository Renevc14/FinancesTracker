import { db } from "@/lib/db";
import { assets, reconciliationLogs } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { IgnoreDriftButton } from "@/components/forms/ignore-drift-button";
import { formatPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const rows = await db
    .select({
      log: reconciliationLogs,
      ticker: assets.ticker,
    })
    .from(reconciliationLogs)
    .innerJoin(assets, eq(assets.id, reconciliationLogs.assetId))
    .where(eq(reconciliationLogs.resolved, false))
    .orderBy(desc(reconciliationLogs.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ios-large-title">Reconciliación</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Drift API vs lo calculado en el tracker
        </p>
      </div>
      <ul className="space-y-3">
        {rows.length === 0 && (
          <li className="ios-group px-4 py-6 text-[15px] text-[var(--muted)]">
            Sin drifts abiertos
          </li>
        )}
        {rows.map(({ log, ticker }) => (
          <li key={log.id} className="ios-group space-y-2 p-4">
            <p className="ios-headline">{ticker}</p>
            <p className="text-[15px] text-[var(--ink-soft)]">
              API {log.apiBalance} · DB {log.dbBalance}
            </p>
            <p className="text-[13px] text-[var(--warn)]">
              Drift {formatPct(log.driftPct * 100)} · {log.status}
            </p>
            <IgnoreDriftButton logId={log.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
