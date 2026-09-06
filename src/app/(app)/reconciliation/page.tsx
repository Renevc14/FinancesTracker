import { db } from "@/lib/db";
import { assets, reconciliationLogs, syncJobs } from "@/lib/db/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import { IgnoreDriftButton } from "@/components/forms/ignore-drift-button";
import { formatPct, formatQuantity } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  warning: "aviso",
  critical: "crítico",
};

export default async function ReconciliationPage() {
  const [latest] = await db
    .select({ id: syncJobs.id })
    .from(syncJobs)
    .orderBy(desc(syncJobs.startedAt))
    .limit(1);

  const rows = latest
    ? await db
        .select({
          log: reconciliationLogs,
          ticker: assets.ticker,
        })
        .from(reconciliationLogs)
        .innerJoin(assets, eq(assets.id, reconciliationLogs.assetId))
        .where(
          and(
            eq(reconciliationLogs.syncJobId, latest.id),
            eq(reconciliationLogs.resolved, false),
            ne(reconciliationLogs.status, "ok"),
          ),
        )
        .orderBy(desc(reconciliationLogs.createdAt))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ios-large-title">Reconciliación</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Último sync: API (Spot + Earn + Funding + colateral) vs el libro
        </p>
      </div>
      <ul className="ios-group">
        {rows.length === 0 && (
          <li className="px-4 py-6 text-[15px] text-[var(--muted)]">
            Sin drifts abiertos en el último sync
          </li>
        )}
        {rows.map(({ log, ticker }) => (
          <li
            key={log.id}
            className="space-y-3 p-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[var(--separator)]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="ios-headline">{ticker}</p>
              <p className="text-[13px] font-semibold text-[var(--warn)]">
                {formatPct(log.driftPct * 100)} ·{" "}
                {STATUS_LABEL[log.status] ?? log.status}
              </p>
            </div>
            <p className="text-[15px] text-[var(--ink-soft)]">
              API {formatQuantity(log.apiBalance)} · Libro{" "}
              {formatQuantity(log.dbBalance)}
            </p>
            <IgnoreDriftButton logId={log.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
