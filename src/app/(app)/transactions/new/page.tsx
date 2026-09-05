import Link from "next/link";
import { TransactionForm } from "@/components/forms/transaction-form";
import { listAssets } from "@/lib/services/snapshot";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const assets = await listAssets();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href="/transactions"
          className="text-xs text-[var(--accent)] hover:underline"
        >
          ← Volver
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          Nueva transacción
        </h1>
      </div>
      <TransactionForm assets={assets} />
    </div>
  );
}
