import Link from "next/link";
import { db } from "@/lib/db";
import { apiCredentials } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { CredentialForm } from "@/components/forms/credential-form";

export const dynamic = "force-dynamic";

export default async function CredentialsPage() {
  const rows = await db
    .select()
    .from(apiCredentials)
    .orderBy(desc(apiCredentials.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-[13px] font-medium text-[var(--accent)]">
          ← Ajustes
        </Link>
        <h1 className="mt-2 ios-large-title">Credenciales</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          API read-only cifradas. Nunca se muestran en claro. El sync de Binance
          importa el historial Spot de las criptos del catálogo.
        </p>
      </div>
      <div className="ios-group p-4">
        <CredentialForm />
      </div>
      <ul className="ios-group">
        {rows.length === 0 && (
          <li className="px-4 py-6 text-[15px] text-[var(--muted)]">
            Ninguna credencial todavía
          </li>
        )}
        {rows.map((c) => (
          <li key={c.id} className="ios-row">
            <div>
              <p className="ios-headline">{c.label}</p>
              <p className="text-[13px] text-[var(--muted)]">
                {c.provider} · {c.lastVerificationStatus ?? "sin verificar"}
              </p>
            </div>
            <span className="text-[13px] text-[var(--muted-2)]">
              {c.active ? "Activa" : "Revocada"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
