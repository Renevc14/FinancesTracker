import Link from "next/link";
import { LandPaymentForm } from "@/components/forms/land-payment-form";
import { listAssets } from "@/lib/services/snapshot";

export const dynamic = "force-dynamic";

export default async function NewLandPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assets = await listAssets();
  const lands = assets.filter((a) => a.class === "land");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href={`/land/${id}`}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          ← Volver al lote
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          Nuevo pago
        </h1>
      </div>
      <LandPaymentForm lands={lands} defaultLandId={id} />
    </div>
  );
}
