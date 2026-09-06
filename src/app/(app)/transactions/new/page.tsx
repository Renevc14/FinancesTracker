import Link from "next/link";
import { TransactionForm } from "@/components/forms/transaction-form";
import { listAssets } from "@/lib/services/snapshot";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const assets = await listAssets();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/transactions"
          className="text-[13px] font-medium text-[var(--accent)]"
        >
          ← Movimientos
        </Link>
        <h1 className="mt-2 ios-large-title">Nueva transacción</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Compra, venta o transferencia
        </p>
      </div>
      <div className="ios-group p-4">
        <TransactionForm assets={assets} />
      </div>
    </div>
  );
}
