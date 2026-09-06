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
          className="mx-auto max-w-lg px-5"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex h-11 items-center justify-between gap-3">
            <p className="ios-headline leading-none">{title}</p>
            <CurrencyToggle current={displayCurrency} />
          </div>
        </div>
      </header>

      <div
        className="mx-auto max-w-lg px-5 pt-3 md:pb-12"
        style={{ paddingBottom: "calc(var(--tabbar-h) + 28px)" }}
      >
        <aside className="mb-6 hidden md:block">
          <nav className="flex rounded-full bg-[var(--surface-3)] p-1">
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "ios-pressable flex-1 rounded-full px-2 py-2 text-center text-[13px] font-semibold tracking-tight",
                    active
                      ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_0.5px_1px_rgba(0,0,0,0.12)]"
                      : "text-[var(--muted)]",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
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
                    "ios-pressable flex min-h-[49px] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-medium",
                    active ? "text-[var(--accent)]" : "text-[var(--muted)]",
                  )}
                >
                  <Icon size={24} strokeWidth={active ? 2.25 : 1.7} />
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
