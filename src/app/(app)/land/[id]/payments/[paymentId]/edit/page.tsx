import Link from "next/link";
import { notFound } from "next/navigation";
import { LandPaymentForm } from "@/components/forms/land-payment-form";
import { getLatestFxRate } from "@/lib/services/fx";
import { getLandLot, getLandPayment } from "@/lib/services/land";
import { serializeForClient } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditLandPaymentPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const { id, paymentId } = await params;
  const [lot, payment] = await Promise.all([
    getLandLot(id),
    getLandPayment(paymentId),
  ]);
  if (!lot || !payment || payment.landAssetId !== lot.asset.id) {
    notFound();
  }
  const fx = (await getLatestFxRate("USD", "BOB")) ?? 12.3;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/land/${id}?tab=payments`} className="ios-back">
          ‹ Payments
        </Link>
        <h1 className="ios-large-title">Edit payment</h1>
      </div>
      <div className="ios-group p-4">
        <LandPaymentForm
          lands={[lot.asset]}
          defaultLandId={lot.asset.id}
          defaultFx={String(fx)}
          payment={serializeForClient(payment)}
        />
      </div>
    </div>
  );
}
