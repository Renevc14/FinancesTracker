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
        <h1 className="ios-large-title">Ajustes</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Configuración del tracker
        </p>
      </div>

      <section className="space-y-2">
        <p className="ios-section-label">General</p>
        <dl className="ios-group">
          <div className="ios-row">
            <dt className="text-[15px]">Moneda</dt>
            <dd className="money text-[15px] text-[var(--muted)]">
              {config?.displayCurrency ?? "USD"}
            </dd>
          </div>
          <div className="ios-row">
            <dt className="text-[15px]">Zona horaria</dt>
            <dd className="text-[15px] text-[var(--muted)]">
              {config?.timezone ?? "America/La_Paz"}
            </dd>
          </div>
          <div className="ios-row">
            <dt className="text-[15px]">Umbral Modelo 720</dt>
            <dd className="money text-[15px] text-[var(--muted)]">
              €{(config?.eurUsdThreshold ?? 50000).toLocaleString("es-ES")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">Catálogos</p>
        <ul className="ios-group">
          <li>
            <Link href="/settings/assets" className="ios-row ios-pressable">
              <span className="text-[15px]">Activos</span>
              <span className="text-[15px] text-[var(--muted-2)]">›</span>
            </Link>
          </li>
          <li>
            <Link href="/settings/fx" className="ios-row ios-pressable">
              <span className="text-[15px]">Tipos de cambio</span>
              <span className="text-[15px] text-[var(--muted-2)]">›</span>
            </Link>
          </li>
          <li>
            <Link href="/settings/credentials" className="ios-row ios-pressable">
              <span className="text-[15px]">API keys (Binance / IBKR / Kraken)</span>
              <span className="text-[15px] text-[var(--muted-2)]">›</span>
            </Link>
          </li>
          <li>
            <Link href="/settings/banks" className="ios-row ios-pressable">
              <span className="text-[15px]">Cuentas bancarias</span>
              <span className="text-[15px] text-[var(--muted-2)]">›</span>
            </Link>
          </li>
          <li>
            <a href="/api/backup" className="ios-row ios-pressable">
              <span className="text-[15px]">Backup JSON</span>
              <span className="text-[15px] text-[var(--muted-2)]">›</span>
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">Planificación</p>
        <ul className="ios-group">
          <li>
            <Link href="/sync" className="ios-row ios-pressable">
              <span className="text-[15px]">Sync y salud de APIs</span>
              <span className="text-[15px] text-[var(--muted-2)]">›</span>
            </Link>
          </li>
          <li>
            <Link href="/reconciliation" className="ios-row ios-pressable">
              <span className="text-[15px]">Reconciliación</span>
              <span className="text-[15px] text-[var(--muted-2)]">›</span>
            </Link>
          </li>
          <li>
            <Link href="/fire" className="ios-row ios-pressable">
              <span className="text-[15px]">FIRE</span>
              <span className="text-[15px] text-[var(--muted-2)]">›</span>
            </Link>
          </li>
          <li>
            <Link href="/compliance" className="ios-row ios-pressable">
              <span className="text-[15px]">Modelo 720/721</span>
              <span className="text-[15px] text-[var(--muted-2)]">›</span>
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
