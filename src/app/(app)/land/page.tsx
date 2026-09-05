import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { listLandLots } from "@/lib/services/land";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandPage() {
  const lots = await listLandLots();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Terrenos</h1>
          <p className="text-sm text-[var(--muted)]">
            Contratos, pagos y cronograma
          </p>
        </div>
      </div>

      <ul className="space-y-4">
        {lots.length === 0 && (
          <li className="text-sm text-[var(--muted)]">
            Sin lotes. Ejecuta el seed para cargar Berchatti.
          </li>
        )}
        {lots.map((lot) => (
          <li key={lot.asset.id}>
            <Link
              href={`/land/${lot.asset.id}`}
              className="block space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-4 transition-colors hover:border-[var(--accent)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl">{lot.asset.ticker}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {lot.contract.location} · {lot.contract.surfaceM2} m²
                  </p>
                </div>
                <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
                  {lot.contract.status}
                </span>
              </div>
              <Progress value={lot.paidPct} />
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">
                  {lot.paidPct.toFixed(1)}% pagado
                </span>
                <span className="font-mono">
                  {formatMoney(lot.paidUsd, "USD")} /{" "}
                  {formatMoney(lot.paidLocal + lot.remainingLocal, "BOB")}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {lots[0] && (
        <Button className="w-full">
          <Link href={`/land/${lots[0].asset.id}/payments/new`}>
            Registrar pago
          </Link>
        </Button>
      )}
    </div>
  );
}
