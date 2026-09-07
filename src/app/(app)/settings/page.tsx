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
      <section className="space-y-2">
        <p className="ios-section-label">General</p>
        <dl className="ios-group">
          <div className="ios-row">
            <dt className="text-[17px]">Currency</dt>
            <dd className="money text-[17px] text-[var(--muted)]">
              {config?.displayCurrency ?? "USD"}
            </dd>
          </div>
          <div className="ios-row">
            <dt className="text-[17px]">Time zone</dt>
            <dd className="text-[17px] text-[var(--muted)]">
              {config?.timezone ?? "America/La_Paz"}
            </dd>
          </div>
          <div className="ios-row">
            <dt className="text-[17px]">Modelo 720</dt>
            <dd className="money text-[17px] text-[var(--muted)]">
              €{(config?.eurUsdThreshold ?? 50000).toLocaleString("en-US")}
            </dd>
          </div>
          <div className="ios-row">
            <dt className="text-[17px]">Dark mode</dt>
            <dd>
              <ThemeToggle current={parseTheme(config?.theme)} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">Catalog</p>
        <ul className="ios-group">
          <SettingsLink href="/settings/income" label="Salary" />
          <SettingsLink href="/settings/assets" label="Assets" />
          <SettingsLink href="/settings/fx" label="FX" />
          <SettingsLink href="/settings/credentials" label="API keys" />
          <SettingsLink href="/settings/banks" label="Banks" />
          <li>
            <a href="/api/backup" className="ios-row ios-pressable">
              <span className="text-[17px]">Backup</span>
              <Chevron />
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">Planning</p>
        <ul className="ios-group">
          <SettingsLink href="/snapshots" label="Snapshots" />
          <SettingsLink href="/sync" label="Sync" />
          <SettingsLink href="/reconciliation" label="Reconciliation" />
          <SettingsLink href="/fire" label="FIRE" />
          <SettingsLink href="/compliance" label="Modelo 720/721" />
        </ul>
      </section>

      <section className="space-y-2">
        <p className="ios-section-label">Session</p>
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
                Sign out
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
