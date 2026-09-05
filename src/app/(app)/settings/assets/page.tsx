import Link from "next/link";
import { listAssets } from "@/lib/services/snapshot";

export const dynamic = "force-dynamic";

const CLASS_LABELS: Record<string, string> = {
  crypto: "Cripto",
  stock: "Acciones",
  stable: "Estables",
  land: "Terrenos",
  cash: "Cash",
};

export default async function AssetsSettingsPage() {
  const assets = await listAssets();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="text-xs text-[var(--accent)] hover:underline"
        >
          ← Ajustes
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">Activos</h1>
        <p className="text-sm text-[var(--muted)]">Catálogo reutilizable</p>
      </div>

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/70">
        {assets.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="font-medium">
                {a.ticker}{" "}
                <span className="text-[var(--muted)]">· {a.name}</span>
              </p>
              <p className="text-xs text-[var(--muted)]">
                {CLASS_LABELS[a.class] ?? a.class} · base {a.currencyBase}
              </p>
            </div>
            <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
              {a.class}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
