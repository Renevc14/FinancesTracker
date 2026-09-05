import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { fxRates } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FxSettingsPage() {
  const rates = await db
    .select()
    .from(fxRates)
    .orderBy(desc(fxRates.date), desc(fxRates.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="text-xs text-[var(--accent)] hover:underline"
        >
          ← Ajustes
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          Tipos de cambio
        </h1>
        <p className="text-sm text-[var(--muted)]">
          FX histórico (paralelo BOB = manual)
        </p>
      </div>

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/70">
        {rates.length === 0 && (
          <li className="px-4 py-6 text-sm text-[var(--muted)]">
            Sin FX. Ejecuta{" "}
            <code className="font-mono">npm run db:seed</code>.
          </li>
        )}
        {rates.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">
                {r.fromCurrency}/{r.toCurrency}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatDate(r.date)} · {r.source}
              </p>
            </div>
            <p className="font-mono">{r.rate.toFixed(4)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
