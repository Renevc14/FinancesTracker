import Link from "next/link";
import { db } from "@/lib/db";
import { apiCredentials, syncJobs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { RunSyncButton } from "@/components/forms/run-sync-button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const creds = await db.select().from(apiCredentials);
  const jobs = await db.select().from(syncJobs).orderBy(desc(syncJobs.startedAt)).limit(12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ios-large-title">Sync</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Estado de exchanges y reconciliación
        </p>
      </div>
      <ul className="ios-group">
        {creds.length === 0 && (
          <li className="px-4 py-6 text-[15px] text-[var(--muted)]">
            <Link href="/settings/credentials" className="text-[var(--accent)]">
              Carga una API key
            </Link>{" "}
            para sincronizar.
          </li>
        )}
        {creds.map((c) => (
          <li key={c.id} className="ios-row">
            <div>
              <p className="ios-headline">{c.label}</p>
              <p className="text-[13px] text-[var(--muted)]">
                {c.provider} · {c.lastVerificationStatus ?? "pendiente"}
              </p>
            </div>
            <RunSyncButton credentialId={c.id} />
          </li>
        ))}
      </ul>
      <section className="space-y-2">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="ios-title">Historial</h2>
          <Link href="/reconciliation" className="text-[15px] font-medium text-[var(--accent)]">
            Drifts
          </Link>
        </div>
        <ul className="ios-group">
          {jobs.length === 0 && (
            <li className="px-4 py-6 text-[15px] text-[var(--muted)]">Sin syncs todavía</li>
          )}
          {jobs.map((j) => (
            <li key={j.id} className="ios-row">
              <div>
                <p className="ios-headline capitalize">{j.status}</p>
                <p className="text-[13px] text-[var(--muted)]">
                  {formatDate(j.startedAt.slice(0, 10))} · {j.triggeredBy}
                </p>
              </div>
              <p className="text-[13px] text-[var(--muted)]">
                {j.recordsFetched} fetch
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
