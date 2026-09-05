import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const config = await db.query.userConfig.findFirst();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Ajustes</h1>
        <p className="text-sm text-[var(--muted)]">
          Configuración personal del tracker
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl">General</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
            <dt>Moneda display</dt>
            <dd className="font-mono">{config?.displayCurrency ?? "USD"}</dd>
          </div>
          <div className="flex justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
            <dt>Timezone</dt>
            <dd className="font-mono">{config?.timezone ?? "America/La_Paz"}</dd>
          </div>
          <div className="flex justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
            <dt>Umbral Modelo 720</dt>
            <dd className="font-mono">
              €{(config?.eurUsdThreshold ?? 50000).toLocaleString()}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl">Catálogos</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/settings/assets"
              className="block rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 px-4 py-3 hover:border-[var(--accent)]/40"
            >
              Activos →
            </Link>
          </li>
          <li>
            <Link
              href="/settings/fx"
              className="block rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 px-4 py-3 hover:border-[var(--accent)]/40"
            >
              Tipos de cambio →
            </Link>
          </li>
        </ul>
      </section>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="outline" className="w-full">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
