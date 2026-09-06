import Link from "next/link";
import { signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Chevron } from "@/components/ui/chevron";
import { db } from "@/lib/db";
import { parseTheme } from "@/lib/theme";

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
            <dt className="text-[17px]">Moneda</dt>
            <dd className="money text-[17px] text-[var(--muted)]">
              {config?.displayCurrency ?? "USD"}
            </dd>
          </div>
          <div className="ios-row">
            <dt className="text-[17px]">Zona horaria</dt>
            <dd className="text-[17px] text-[var(--muted)]">
              {config?.timezone ?? "America/La_Paz"}
            </dd>
          </div>
          <div className="ios-row">
            <dt className="text-[17px]">Umbral Modelo 720</dt>
            <dd className="money text-[17px] text-[var(--muted)]">
              €{(config?.eurUsdThreshold ?? 50000).toLocaleString("es-ES")}
            </dd>
          </div>
          <div className="ios-row">
            <dt className="text-[17px]">Modo noche</dt>
            <dd>
              <ThemeToggle current={parseTheme(config?.theme)} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">Catálogos</p>
        <ul className="ios-group">
          <SettingsLink href="/settings/assets" label="Activos" />
          <SettingsLink href="/settings/fx" label="Tipos de cambio" />
          <SettingsLink
            href="/settings/credentials"
            label="API keys"
          />
          <SettingsLink href="/settings/banks" label="Cuentas bancarias" />
          <li>
            <a href="/api/backup" className="ios-row ios-pressable">
              <span className="text-[17px]">Backup JSON</span>
              <Chevron />
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">Planificación</p>
        <ul className="ios-group">
          <SettingsLink href="/sync" label="Sync y salud de APIs" />
          <SettingsLink href="/reconciliation" label="Reconciliación" />
          <SettingsLink href="/fire" label="FIRE" />
          <SettingsLink href="/compliance" label="Modelo 720/721" />
        </ul>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">Sesión</p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <ul className="ios-group">
            <li>
              <button
                type="submit"
                className="ios-row ios-pressable w-full text-left text-[17px] text-[var(--danger)]"
              >
                Cerrar sesión
              </button>
            </li>
          </ul>
        </form>
      </section>
    </div>
  );
}

function SettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="ios-row ios-pressable">
        <span className="text-[17px]">{label}</span>
        <Chevron />
      </Link>
    </li>
  );
}
