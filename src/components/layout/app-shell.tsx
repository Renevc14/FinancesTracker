"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Camera,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyToggle } from "@/components/layout/currency-toggle";
import type { DisplayCurrency } from "@/lib/db/schema";

const links = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/land", label: "Terrenos", icon: Landmark },
  { href: "/snapshots", label: "Fotos", icon: Camera },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function AppShell({
  children,
  displayCurrency,
}: {
  children: React.ReactNode;
  displayCurrency: DisplayCurrency;
}) {
  const pathname = usePathname();
  const title =
    links.find((l) => pathname.startsWith(l.href))?.label ?? "Patrimonio";

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <header className="ios-blur sticky top-0 z-40 border-b border-[var(--separator)]">
        <div
          className="mx-auto flex h-11 max-w-lg items-center justify-between px-4"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <p className="ios-headline truncate">{title}</p>
          <CurrencyToggle current={displayCurrency} />
        </div>
      </header>

      <div
        className="mx-auto max-w-lg px-4 pt-3 md:pb-10"
        style={{ paddingBottom: "calc(var(--tabbar-h) + 20px)" }}
      >
        <aside className="mb-4 hidden flex-wrap gap-1 md:flex">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "ios-pressable rounded-full px-3 py-1.5 text-[13px] font-semibold",
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface)] text-[var(--ink-soft)]",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </aside>
        <main className="min-w-0 animate-fade-in">{children}</main>
      </div>

      <nav
        className="ios-blur-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--separator)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "ios-pressable flex flex-col items-center gap-0.5 px-1 pb-1 pt-2 text-[10px] font-medium",
                    active ? "text-[var(--accent)]" : "text-[var(--muted)]",
                  )}
                >
                  <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                  <span className="truncate">{l.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
