import Link from "next/link";
import { LandPaymentForm } from "@/components/forms/land-payment-form";
import { getLatestFxRate } from "@/lib/services/fx";
import { listLandLots } from "@/lib/services/land";

export const dynamic = "force-dynamic";

export default async function NewLandPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ lote?: string }>;
}) {
  const { lote } = await searchParams;
  const lots = await listLandLots();
  const lands = lots.map((l) => l.asset);
  const fx = (await getLatestFxRate("USD", "BOB")) ?? 12.3;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={lote ? `/land/${lote}?tab=payments` : "/land"}
          className="text-[13px] font-medium text-[var(--accent)]"
        >
          ← Terrenos
        </Link>
        <h1 className="mt-2 ios-large-title">Nuevo pago</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Cuota, inicial o reserva de Berchatti
        </p>
      </div>
      <div className="ios-group p-4">
        <LandPaymentForm
          lands={lands}
          defaultLandId={lote}
          defaultFx={String(fx)}
        />
      </div>
    </div>
  );
}
