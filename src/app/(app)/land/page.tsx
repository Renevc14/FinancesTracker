import Link from "next/link";
import { AssetLogo } from "@/components/ui/asset-logo";
import { Progress } from "@/components/ui/progress";
import { landStatusLabel } from "@/lib/labels";
import { listLandLots } from "@/lib/services/land";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandPage() {
  const lots = await listLandLots();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="ios-large-title">Terrenos</h1>
          <p className="mt-1 text-[15px] text-[var(--muted)]">
            Berchatti · Urubó
          </p>
        </div>
        {lots[0] && (
          <Link
            href={`/pagos/nuevo?lote=${lots[0].asset.id}`}
            className="ios-pressable inline-flex h-8 items-center rounded-full bg-[var(--accent)] px-4 text-[15px] font-semibold text-[var(--accent-fg)]"
          >
            Pago
          </Link>
        )}
      </div>

      <ul className="space-y-3">
        {lots.length === 0 && (
          <li className="px-4 py-8 text-center text-[15px] text-[var(--muted)]">
            Sin lotes. Ejecuta el seed para cargar Berchatti.
          </li>
        )}
        {lots.map((lot) => (
          <li key={lot.asset.id}>
            <Link href={`/land/${lot.asset.id}`} className="ios-pressable block">
              <div className="ios-group space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <AssetLogo
                      ticker={lot.asset.ticker}
                      assetClass="land"
                      size={40}
                    />
                    <div>
                      <p className="ios-headline">{lot.asset.ticker}</p>
                      <p className="text-[13px] text-[var(--muted)]">
                        {lot.contract.surfaceM2} m² · {lot.contract.location}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ink-soft)]">
                    {landStatusLabel(lot.contract.status)}
                  </span>
                </div>
                <Progress value={lot.paidPct} />
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-[var(--muted)]">
                    {lot.paidPct.toFixed(1)}% pagado
                  </span>
                  <span className="money text-[var(--ink-soft)]">
                    {formatMoney(lot.paidUsd, "USD")}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
