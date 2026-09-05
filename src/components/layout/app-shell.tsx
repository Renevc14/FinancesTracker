"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Camera,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CurrencyToggle } from "@/components/layout/currency-toggle";
import type { DisplayCurrency } from "@/lib/db/schema";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/land", label: "Terrenos", icon: Landmark },
  { href: "/snapshots", label: "Snapshots", icon: Camera },
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
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-[var(--accent)]/15 blur-3xl" />
        <div className="absolute bottom-0 left-[-10%] h-80 w-80 rounded-full bg-[var(--ink)]/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--ink) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-[var(--border)]/70 bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-[var(--surface-2)] md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menú"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link href="/dashboard" className="font-display text-lg tracking-tight">
              Patrimonio
            </Link>
          </div>
          <CurrencyToggle current={displayCurrency} />
        </div>
      </header>

      {open && (
        <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:hidden">
          <ul className="space-y-1">
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      active
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "text-[var(--ink-soft)] hover:bg-[var(--surface-2)]",
                    )}
                  >
                    <Icon size={16} />
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="mx-auto flex max-w-3xl gap-6 px-4 pb-24 pt-6 md:pb-8">
        <aside className="hidden w-44 shrink-0 md:block">
          <nav className="sticky top-20 space-y-1">
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--accent)]/15 font-medium text-[var(--accent)]"
                      : "text-[var(--ink-soft)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <Icon size={16} />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 animate-fade-in">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)]/70 bg-[var(--bg)]/90 backdrop-blur-md md:hidden">
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px]",
                    active ? "text-[var(--accent)]" : "text-[var(--muted)]",
                  )}
                >
                  <Icon size={18} />
                  <span className="truncate">{l.label.split(" ")[0]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
