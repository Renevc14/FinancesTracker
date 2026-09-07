import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { fxRates } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";
import { RefreshMarketsButton } from "@/components/forms/refresh-markets-button";

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
        <Link href="/settings" className="ios-back">
          ‹ Settings
        </Link>
        <h1 className="mt-2 ios-large-title">FX</h1>
      </div>

      <RefreshMarketsButton />

      <ul className="ios-group">
        {rates.length === 0 && (
          <li className="px-4 py-6 text-[15px] text-[var(--muted)]">None yet</li>
        )}
        {rates.map((r) => (
          <li key={r.id} className="ios-row">
            <div>
              <p className="ios-headline">
                {r.fromCurrency}/{r.toCurrency}
              </p>
              <p className="text-[13px] text-[var(--muted)]">
                {formatDate(r.date)} · {r.source}
              </p>
            </div>
            <p className="money text-[17px]">{r.rate.toFixed(4)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
